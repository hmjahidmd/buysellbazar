import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import env from '../../config/env';
import logger from '../../config/logger';
import { getRedisClient } from '../../config/redis';
import { User, IUserDocument } from '../users/user.model';
import { AuditLog, computeAuditHash } from '../moderation/auditLog.model';
import { BlacklistedDevice } from '../moderation/blacklistedDevice.model';
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from '../../core/errors/AppError';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthSuccessResult {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    mobileNumber: string;
    role: string;
    isNidVerified: boolean;
    profile: {
      displayName?: string;
      avatarUrl?: string;
      division?: string;
      district?: string;
      thana?: string;
    };
  };
}

export class AuthService {
  /**
   * Helper to write cryptographic WORM chained audit record
   */
  private static async logAuditEvent(params: {
    traceId: string;
    userId?: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const lastLog = await AuditLog.findOne().sort({ createdAt: -1 }).select('currentHash');
      const previousHash = lastLog
        ? lastLog.currentHash
        : crypto.createHash('sha256').update('BUYSELL_BD_GENESIS_BLOCK').digest('hex');

      const timestamp = new Date();
      const currentHash = computeAuditHash(previousHash, {
        traceId: params.traceId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
        timestamp,
      });

      await AuditLog.create({
        traceId: params.traceId,
        userId: params.userId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        previousHash,
        currentHash,
        metadata: params.metadata || {},
        createdAt: timestamp,
      });
    } catch (auditErr) {
      logger.error('Failed to write immutable audit log: ', auditErr);
    }
  }

  /**
   * 2.1 Request OTP Challenge (crypto-secure 6 digits, 180s TTL, 5-attempt rate limit)
   */
  public static async requestOtp(
    mobileNumber: string,
    clientIp: string,
    traceId: string,
    userAgent?: string
  ): Promise<{ success: boolean; expiresInSeconds: number }> {
    const redis = getRedisClient();

    // Check if mobile is locked out due to previous failed attempts
    const isLocked = await redis.get(`otp_lockout:${mobileNumber}`);
    if (isLocked) {
      const ttl = await redis.ttl(`otp_lockout:${mobileNumber}`);
      throw new BadRequestError(
        `Mobile account locked due to excessive failed attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`,
        'OTP_LOCKOUT'
      );
    }

    // Generate crypto-secure 6-digit OTP (in development, 123456 is standard for easy testing)
    const otp = env.NODE_ENV === 'development'
      ? '123456'
      : crypto.randomInt(100000, 999999).toString();

    // Save in Redis with 180s (3m) expiry
    await redis.set(`otp:${mobileNumber}`, otp, 'EX', 180);

    // Initialize attempt counter with 900s (15m) TTL if not existing
    const attemptsKey = `otp_attempts:${mobileNumber}`;
    const exists = await redis.exists(attemptsKey);
    if (!exists) {
      await redis.set(attemptsKey, '0', 'EX', 900);
    }

    logger.info(`[Auth] OTP dispatched for ${mobileNumber.slice(0, 3)}****${mobileNumber.slice(-4)} (Dev OTP: ${env.NODE_ENV === 'development' ? otp : '***'})`);

    await this.logAuditEvent({
      traceId,
      actorRole: 'guest',
      action: 'AUTH_OTP_REQUESTED',
      entityType: 'AUTH',
      entityId: mobileNumber,
      ipAddress: clientIp,
      userAgent,
      metadata: { mobileMasked: `${mobileNumber.slice(0, 3)}****${mobileNumber.slice(-4)}` },
    });

    return { success: true, expiresInSeconds: 180 };
  }

  /**
   * 2.2 Verify OTP Challenge, Bind Device Fingerprint & Issue Token Pair
   */
  public static async verifyOtp(params: {
    mobileNumber: string;
    otp: string;
    deviceFingerprintHash: string;
    deviceModel?: string;
    clientIp: string;
    traceId: string;
    userAgent?: string;
  }): Promise<AuthSuccessResult> {
    const { mobileNumber, otp, deviceFingerprintHash, deviceModel, clientIp, traceId, userAgent } = params;
    const redis = getRedisClient();

    // 1. Check if device is permanently blacklisted for fraud
    const blacklisted = await BlacklistedDevice.findOne({ deviceFingerprintHash });
    if (blacklisted) {
      throw new ForbiddenError(
        'This device has been permanently blocked due to violations of platform terms and safety policies.',
        'DEVICE_BLACKLISTED'
      );
    }

    // 2. Retrieve active OTP
    const storedOtp = await redis.get(`otp:${mobileNumber}`);
    if (!storedOtp) {
      throw new BadRequestError('OTP has expired or was not requested. Please request a new OTP.', 'OTP_EXPIRED');
    }

    // 3. Verify OTP
    if (storedOtp !== otp) {
      const attemptsKey = `otp_attempts:${mobileNumber}`;
      const failedAttempts = await redis.incr(attemptsKey);

      if (failedAttempts >= 5) {
        // Enforce 15 minutes lockout
        await redis.set(`otp_lockout:${mobileNumber}`, '1', 'EX', 900);
        await redis.del(`otp:${mobileNumber}`);
        await redis.del(attemptsKey);

        throw new BadRequestError(
          'Maximum verification attempts exceeded. Your account has been temporarily locked for 15 minutes.',
          'MAX_ATTEMPTS_EXCEEDED'
        );
      }

      throw new BadRequestError(
        `Invalid verification code. You have ${5 - failedAttempts} attempts remaining.`,
        'INVALID_OTP'
      );
    }

    // Clear OTP upon successful match
    await redis.del(`otp:${mobileNumber}`);
    await redis.del(`otp_attempts:${mobileNumber}`);

    // 4. Find or create user document
    let user = await User.findOne({ mobileNumber });
    let isNewUser = false;

    if (!user) {
      user = new User({
        mobileNumber,
        role: 'buyer',
        accountStatus: 'ACTIVE',
        isNidVerified: false,
        profile: {
          displayName: `Member ${mobileNumber.slice(-4)}`,
        },
      });
      isNewUser = true;
    }

    // Check account status
    if (user.accountStatus === 'BANNED') {
      throw new ForbiddenError('Your account has been permanently suspended.', 'ACCOUNT_BANNED');
    }

    // 5. Upsert Device Binding
    const existingDeviceIndex = user.boundDevices.findIndex(
      (d) => d.deviceFingerprintHash === deviceFingerprintHash
    );

    if (existingDeviceIndex >= 0) {
      user.boundDevices[existingDeviceIndex].lastIpAddress = clientIp;
      user.boundDevices[existingDeviceIndex].boundAt = new Date();
      if (deviceModel) user.boundDevices[existingDeviceIndex].deviceModel = deviceModel;
    } else {
      user.boundDevices.push({
        deviceFingerprintHash,
        deviceModel: deviceModel || 'Web Browser',
        lastIpAddress: clientIp,
        boundAt: new Date(),
      });
    }

    await user.save();

    // 6. Generate Token Pair (Access Token: 15m, Refresh Token: 7d)
    const tokenFamilyId = uuidv4();
    const accessJti = uuidv4();

    const accessToken = jwt.sign(
      {
        sub: user._id.toString(),
        mobile: user.mobileNumber,
        role: user.role,
        isNidVerified: user.isNidVerified,
        jti: accessJti,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY as any }
    );

    const refreshToken = jwt.sign(
      {
        sub: user._id.toString(),
        tokenFamilyId,
        deviceHash: deviceFingerprintHash,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY as any }
    );

    // Save refresh token family key in Redis (7 days TTL = 604800s)
    await redis.set(`refresh:${user._id.toString()}:${tokenFamilyId}`, refreshToken, 'EX', 604800);

    // Write WORM audit log
    await this.logAuditEvent({
      traceId,
      userId: user._id.toString(),
      actorRole: user.role,
      action: isNewUser ? 'AUTH_REGISTER_SUCCESS' : 'AUTH_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user._id.toString(),
      ipAddress: clientIp,
      userAgent,
      metadata: { deviceFingerprintHash, isNewUser },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        userId: user._id.toString(),
        mobileNumber: user.mobileNumber,
        role: user.role,
        isNidVerified: user.isNidVerified,
        profile: {
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
          division: user.profile.division,
          district: user.profile.district,
          thana: user.profile.thana,
        },
      },
    };
  }

  /**
   * 2.3 Rotate Refresh Token
   */
  public static async rotateRefreshToken(
    oldRefreshToken: string,
    clientIp: string,
    traceId: string
  ): Promise<TokenPair> {
    const redis = getRedisClient();

    let decoded: { sub: string; tokenFamilyId: string; deviceHash?: string };
    try {
      decoded = jwt.verify(oldRefreshToken, env.JWT_REFRESH_SECRET) as typeof decoded;
    } catch (err) {
      throw new UnauthorizedError('Invalid or expired refresh token. Please re-authenticate.', 'REFRESH_TOKEN_INVALID');
    }

    const { sub: userId, tokenFamilyId, deviceHash } = decoded;
    const redisKey = `refresh:${userId}:${tokenFamilyId}`;
    const storedToken = await redis.get(redisKey);

    // If key not found or doesn't match: Token Reuse Detected!
    if (!storedToken || storedToken !== oldRefreshToken) {
      // Security measure: Revoke all refresh tokens for this user family
      await redis.del(redisKey);
      logger.warn(`[Security Alert] Refresh token reuse detected for userId [${userId}]. Session invalidated.`);

      await this.logAuditEvent({
        traceId,
        userId,
        actorRole: 'system',
        action: 'SECURITY_TOKEN_REUSE_DETECTED',
        entityType: 'SESSION',
        entityId: tokenFamilyId,
        ipAddress: clientIp,
      });

      throw new UnauthorizedError(
        'Token reuse anomaly detected. All sessions in this family have been terminated for security.',
        'TOKEN_REUSE_VIOLATION'
      );
    }

    // Fetch user to verify account is still active
    const user = await User.findById(userId);
    if (!user || user.accountStatus === 'BANNED' || user.accountStatus === 'SUSPENDED') {
      await redis.del(redisKey);
      throw new ForbiddenError('Account is no longer active', 'ACCOUNT_INACTIVE');
    }

    // Issue New Token Pair
    const newAccessJti = uuidv4();
    const newAccessToken = jwt.sign(
      {
        sub: user._id.toString(),
        mobile: user.mobileNumber,
        role: user.role,
        isNidVerified: user.isNidVerified,
        jti: newAccessJti,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRY as any }
    );

    const newRefreshToken = jwt.sign(
      {
        sub: user._id.toString(),
        tokenFamilyId,
        deviceHash,
      },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRY as any }
    );

    // Rotate stored token in Redis
    await redis.set(redisKey, newRefreshToken, 'EX', 604800);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * 2.4 Logout & Revoke Session
   */
  public static async logoutUser(
    userId: string,
    accessToken?: string,
    refreshToken?: string,
    traceId?: string,
    clientIp?: string
  ): Promise<void> {
    const redis = getRedisClient();

    // Blacklist access token until natural expiry
    if (accessToken) {
      try {
        const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
        if (decoded && decoded.jti && decoded.exp) {
          const ttlSeconds = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
          await redis.set(`blacklist:${decoded.jti}`, '1', 'EX', ttlSeconds);
        }
      } catch (err) {
        logger.warn('Failed to parse access token for blacklisting: ', err);
      }
    }

    // Revoke refresh token
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken) as { sub: string; tokenFamilyId: string };
        if (decoded && decoded.tokenFamilyId) {
          await redis.del(`refresh:${userId}:${decoded.tokenFamilyId}`);
        }
      } catch (err) {
        logger.warn('Failed to delete refresh token: ', err);
      }
    }

    if (traceId) {
      await this.logAuditEvent({
        traceId,
        userId,
        actorRole: 'user',
        action: 'AUTH_LOGOUT',
        entityType: 'SESSION',
        ipAddress: clientIp,
      });
    }
  }

  /**
   * 2.5 List Bound Device Sessions
   */
  public static async listDeviceSessions(userId: string) {
    const user = await User.findById(userId).select('boundDevices');
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.boundDevices.map((device) => ({
      deviceFingerprintHash: device.deviceFingerprintHash,
      deviceModel: device.deviceModel || 'Unknown Device',
      lastIpAddress: device.lastIpAddress || 'Unknown IP',
      boundAt: device.boundAt,
    }));
  }

  /**
   * 2.6 Revoke Remote Device Session
   */
  public static async revokeDeviceSession(
    userId: string,
    targetDeviceId: string,
    traceId: string,
    clientIp?: string
  ): Promise<{ revoked: boolean }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const initialLength = user.boundDevices.length;
    user.boundDevices = user.boundDevices.filter(
      (d) => d.deviceFingerprintHash !== targetDeviceId
    );

    if (user.boundDevices.length === initialLength) {
      throw new NotFoundError('Device session not found or already revoked');
    }

    await user.save();

    await this.logAuditEvent({
      traceId,
      userId,
      actorRole: user.role,
      action: 'AUTH_DEVICE_REVOKED',
      entityType: 'DEVICE',
      entityId: targetDeviceId,
      ipAddress: clientIp,
      metadata: { revokedDeviceId: targetDeviceId },
    });

    return { revoked: true };
  }
}

export default AuthService;
