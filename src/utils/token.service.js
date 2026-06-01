
// utils/token.service.js

import jwt from "jsonwebtoken";
import crypto from "crypto";
import env from "../config/env.js";
import refreshTmodel from "../models/refreshToken.model.js";
import { AppError } from "../utils/errors.js";
import eventBus from "../events/eventBus.js";

export const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const RevokeReason = Object.freeze({
  REUSE_DETECTED: "REUSE_DETECTED",
  EXPIRED: "EXPIRED",
  ACCESS_REVOKED: "ACCESS_REVOKED",
  MANUAL_LOGOUT: "MANUAL_LOGOUT",
  ROTATED: "ROTATED",
});


export const generateRandomToken = () =>
  crypto.randomBytes(64).toString("hex");

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");


export const createAccessToken = ({ userId, appId, permissions }) => {
  return jwt.sign(
    {
      sub: userId,
      app: appId,
      permissions,
    },
    env.jwt.accessSecret,
    {
      expiresIn: "15m",
      issuer: "auth-service",
    }
  );

  
};


export const createRefreshToken = async ({
  userId,
  appId,
  ip,
  userAgent,
}) => {
  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);

  await refreshTmodel.create({
    userId,
    appId,
    tokenHash,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });
console.log(rawToken,'raw refresh token ')
  return rawToken;
};





export const rotateRefreshToken = async ({
  token,
  ip,
  userAgent,
}) => {
  const tokenHash = hashToken(token);

  const existingToken = await refreshTmodel.findOne({ tokenHash });

  if (!existingToken) {
  

    throw new AppError("Invalid refresh token", 401, "INVALID_TOKEN");
  }

  const { userId, appId } = existingToken;

  if (existingToken.revokedAt) {
    await revokeAllUserSessions(
      { userId, appId },
      RevokeReason.REUSE_DETECTED
    );

    eventBus.emit("auth.token.reuse_detected", {
      userId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: "token_reuse",
      message: "Refresh token reuse detected - all sessions revoked",
    });

    throw new AppError(
      "Refresh token reuse detected",
      401,
      "TOKEN_REUSE"
    );
  }

  if (existingToken.expiresAt < new Date()) {
    await revokeAllUserSessions(
      { userId, appId },
      RevokeReason.EXPIRED
    );

   

    throw new AppError(
      "Refresh token expired",
      401,
      "TOKEN_EXPIRED"
    );
  }

  //  ATOMIC ROTATION
  existingToken.revokedAt = new Date();
  existingToken.revokedReason = RevokeReason.ROTATED;
  await existingToken.save();

  const newRawToken = generateRandomToken();
  const newTokenHash = hashToken(newRawToken);

  await refreshTmodel.create({
    userId,
    appId,
    tokenHash: newTokenHash,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    rotatedFrom: existingToken._id,
    lastUsedAt: new Date(),
  });



  return { rawToken: newRawToken, userId, appId };
};


export const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;

  const tokenHash = hashToken(rawToken);

  await refreshTmodel.updateOne(
    { tokenHash, revokedAt: null },
    { revokedAt: new Date(), revokedReason: RevokeReason.MANUAL_LOGOUT }
  );
};


export const revokeAllUserSessions = async (
  { userId, appId },
  reason = RevokeReason.MANUAL_LOGOUT
) => {
  await refreshTmodel.updateMany(
    { userId, appId, revokedAt: null },
    {
      $set: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    }
  );
};


export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError("Access token expired", 401, "TOKEN_EXPIRED");
    }

    if (error.name === "JsonWebTokenError") {
      throw new AppError("Invalid access token", 401, "INVALID_TOKEN");
    }

    throw new AppError("Token verification failed", 401, "TOKEN_ERROR");
  }
};