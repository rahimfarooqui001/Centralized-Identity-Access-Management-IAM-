// utils/errors.js



export class AppError extends Error {
  constructor(
    message,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    metadata = null
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.metadata = metadata;

    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}


export const unauthorized = (message, code = "UNAUTHORIZED") =>
  new AppError(message, 401, code);


export const forbidden = (message, code = "FORBIDDEN") =>
  new AppError(message, 403, code);