import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export const signToken = (payload: object, options: SignOptions = {}): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as any,
    ...options,
  } as SignOptions);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, env.jwtSecret);
};
