// logger/index.js

import winston from "winston";

const IS_PROD      = process.env.NODE_ENV === "production";
const LOG_LEVEL    = process.env.LOG_LEVEL ?? (IS_PROD ? "info" : "debug");
const SERVICE_NAME = process.env.SERVICE_NAME ?? "auth-service";

const REDACTED_KEYS = new Set([
  "password",
  "token",
  "tokenHash",
  "rawToken",
  "accessToken",
  "refreshToken",
  "secret",
  "authorization",
  "cookie"
]);

const redactSensitiveFields = winston.format((info) => {
  const redact = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => {
        if (REDACTED_KEYS.has(key)) return [key, "[REDACTED]"];
        if (typeof value === "object") return [key, redact(value)];
        return [key, value];
      })
    );
  };

  const { level, message, timestamp, stack, ...meta } = info;
  return Object.assign(info, redact(meta));
});

const devFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr  = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : "";

    const stackStr = stack ? `\n${stack}` : "";

    return `${timestamp} [${level}] ${message}${metaStr}${stackStr}`;
  })
);

const prodFormat = winston.format.combine(
  redactSensitiveFields(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: SERVICE_NAME },
  format: IS_PROD ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ],
  exitOnError: false
});

export default logger;