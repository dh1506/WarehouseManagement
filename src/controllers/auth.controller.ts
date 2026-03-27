import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { catchAsync } from '../utils/catch-async';

export const register = catchAsync(async (req: Request, res: Response) => {
  const user = await authService.register(req.body);

  res.status(201).json({
    success: true,
    data: user,
    message: 'User registered successfully',
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const data = await authService.login(req.body);

  res.status(200).json({
    success: true,
    data,
    message: 'User logged in successfully',
  });
});
