import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import env from '../../config/env';
import { getRedisClient } from '../../config/redis';
import { UnauthorizedError, ForbiddenError } from '../errors/AppError';
import { UserRole } from '../../modules/users/user.model';

export interface AuthUser {
  userId: string;
  mobileNumber: string;
  role: UserRole;
  isNidVerified: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or malformed', 'AUTH_TOKEN_MISSING');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Bearer token is empty', 'AUTH_TOKEN_EMPTY');
    }

    // Verify JWT Signature
    let decoded: jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired. Please refresh token.', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedError('Invalid access token', 'TOKEN_INVALID');
    }

    // Check Redis token blacklist (revoked on logout)
    const jti = decoded.jti;
    if (jti) {
      const redis = getRedisClient();
      if (redis.status === 'ready') {
        const isBlacklisted = await redis.get(`blacklist:${jti}`);
        if (isBlacklisted) {
          throw new UnauthorizedError('Token has been revoked. Please re-login.', 'TOKEN_REVOKED');
        }
      }
    }

    req.user = {
      userId: decoded.sub as string,
      mobileNumber: decoded.mobile as string,
      role: decoded.role as UserRole,
      isNidVerified: Boolean(decoded.isNidVerified),
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required', 'AUTH_REQUIRED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role [${req.user.role}] is not authorized for this operation.`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    next();
  };
};

export const requireNidVerified = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required', 'AUTH_REQUIRED'));
  }

  if (!req.user.isNidVerified) {
    return next(
      new ForbiddenError(
        'Government NID identity verification required to perform this action. Complete e-KYC first.',
        'NID_VERIFICATION_REQUIRED'
      )
    );
  }

  next();
};

export default {
  requireAuth,
  requireRole,
  requireNidVerified,
};
