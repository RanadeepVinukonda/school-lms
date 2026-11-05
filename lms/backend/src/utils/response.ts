import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number) {
  const code = statusCode || 200;
  return res.status(code).json({
    success: true,
    message: message || undefined,
    data,
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta
) {
  return res.status(200).json({
    success: true,
    data,
    pagination,
  });
}

export function sendCreated<T>(res: Response, data: T, message?: string) {
  return sendSuccess(res, data, message, 201);
}

export function sendAccepted<T>(res: Response, data: T, message?: string) {
  return sendSuccess(res, data, message, 202);
}

export function sendError(res: Response, message: string, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: { message },
  });
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
