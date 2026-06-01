
export  function createError(msg, statusCode,code) {
  const err = new Error(msg);
  err.statusCode = statusCode;
  err.code=code;
  err.isOperational = true;
  
  return err;
}

export const badRequest = msg =>
  createError(msg, 400, "BAD_REQUEST");

export const unauthorized = msg =>
  createError(msg, 401, "UNAUTHORIZED");

export const forbidden = msg =>
  createError(msg, 403, "FORBIDDEN");

export const notFound = msg =>
  createError(msg, 404, "NOT_FOUND");

export const conflict = msg =>
  createError(msg, 409, "CONFLICT");

export const lockedError = msg =>
  createError(msg, 423, "ACCOUNT_LOCKED");



