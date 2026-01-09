import type { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err.message);

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    hint: 'Check if the URL path is a valid Microsoft Learn documentation path',
  });
}
