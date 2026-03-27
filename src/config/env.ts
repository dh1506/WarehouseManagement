import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'my-super-secret-key-change-it-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
};
