import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';
  let details: any = [];

  if (err instanceof AppError) {
    errorCode = 'APP_ERROR';
    if (statusCode === 400) errorCode = 'BAD_REQUEST';
    if (statusCode === 401) errorCode = 'UNAUTHORIZED';
    if (statusCode === 403) errorCode = 'FORBIDDEN';
    if (statusCode === 404) errorCode = 'NOT_FOUND';
  }

  // Phương án dự phòng nếu không được xử lý bởi middleware validate.
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
    details = err.errors;
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
  });
};
