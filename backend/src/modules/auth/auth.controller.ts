import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../core/utils/response';
import env from '../../config/env';

const REFRESH_COOKIE_NAME = 'buysell_refresh';

export class AuthController {
  /**
   * 2.1 Request OTP Challenge
   */
  public static async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobileNumber } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.requestOtp(mobileNumber, clientIp, req.traceId, userAgent);

      sendSuccess(
        res,
        {
          challengeSent: result.success,
          expiresInSeconds: result.expiresInSeconds,
          message: '6-digit OTP code dispatched successfully.',
        },
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2.2 Verify OTP Challenge & Issue Tokens
   */
  public static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { mobileNumber, otp, deviceFingerprintHash, deviceModel } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'];

      const result = await AuthService.verifyOtp({
        mobileNumber,
        otp,
        deviceFingerprintHash,
        deviceModel,
        clientIp,
        traceId: req.traceId,
        userAgent,
      });

      // Set Refresh Token in Secure HttpOnly Cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      sendSuccess(
        res,
        {
          tokenType: 'Bearer',
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: 900, // 15 minutes
          user: result.user,
        },
        200,
        'Authentication successful.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2.3 Rotate Refresh Token
   */
  public static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.body.refreshToken;
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          statusCode: 401,
          error: {
            code: 'REFRESH_TOKEN_REQUIRED',
            message: 'Refresh token must be provided via cookie or request body.',
          },
          traceId: req.traceId,
        });
        return;
      }

      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const tokens = await AuthService.rotateRefreshToken(refreshToken, clientIp, req.traceId);

      // Rotate cookie
      res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendSuccess(
        res,
        {
          tokenType: 'Bearer',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 900,
        },
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2.4 Logout & Invalidate Session
   */
  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;
      const refreshToken = req.cookies[REFRESH_COOKIE_NAME] || req.body.refreshToken;
      const userId = req.user?.userId;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      if (userId) {
        await AuthService.logoutUser(userId, accessToken, refreshToken, req.traceId, clientIp);
      }

      // Clear cookie
      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
      });

      sendSuccess(res, { loggedOut: true }, 200, 'Session terminated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2.5 List Bound Device Sessions
   */
  public static async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const sessions = await AuthService.listDeviceSessions(userId);

      sendSuccess(
        res,
        {
          total: sessions.length,
          sessions,
        },
        200
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2.6 Revoke Remote Device Session
   */
  public static async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { deviceId } = req.params;
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

      const result = await AuthService.revokeDeviceSession(userId, deviceId, req.traceId, clientIp);

      sendSuccess(res, result, 200, 'Device session revoked successfully.');
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
