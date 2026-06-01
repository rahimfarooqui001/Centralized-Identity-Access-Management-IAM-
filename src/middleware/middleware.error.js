// middleware/error.middleware.js

import env from "../config/env.js";

const errorMiddleware = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  const response = {
    success: false,
    error: {
      code: err.code || "INTERNAL_ERROR",
      message: isOperational
        ? err.message
        : "Something went wrong"
    }
  };

  
  if (isOperational && err.metadata) {
    response.error.metadata = err.metadata;
  }

  if (env.nodeEnv === "development") {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorMiddleware;