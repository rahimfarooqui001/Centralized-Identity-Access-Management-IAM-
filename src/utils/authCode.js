


import crypto from "crypto";
import authCodeModel from "../models/authorizationCode.model.js";
import { AppError } from "./errors.js";

export const generateAuthorizationCode = () =>
  crypto.randomBytes(32).toString("hex");

export const createAuthorizationCode = async ({
  userId,
  appId,
  redirectUri,
  ttlSeconds = 120
}) => {
  const code = generateAuthorizationCode();

  await authCodeModel.create({
    code,
    userId,
    appId,
    redirectUri,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000)
  });

  return code;
};

export const validateAuthorizationCode = async ({
  code,
  clientAppId,
  redirectUri
}) => {
  const authCode = await authCodeModel.findOne({ code });

  if (!authCode) {
    throw new AppError(
      "Invalid authorization code",
      400,
      "INVALID_AUTH_CODE"
    );
  }

  if (authCode.used) {
    throw new AppError(
      "Authorization code already used",
      400,
      "CODE_ALREADY_USED"
    );
  }

  if (authCode.expiresAt < new Date()) {
    throw new AppError(
      "Authorization code expired",
      400,
      "CODE_EXPIRED"
    );
  }

  if (authCode.appId.toString() !== clientAppId.toString()) {
    throw new AppError(
      "Authorization code does not belong to this app",
      400,
      "INVALID_APP"
    );
  }

  if (authCode.redirectUri !== redirectUri) {
    throw new AppError(
      "Redirect URI mismatch",
      400,
      "INVALID_REDIRECT_URI"
    );
  }

  return authCode;
};

export const consumeAuthorizationCode = async (authCodeDoc) => {
  authCodeDoc.used = true;
  await authCodeDoc.save();
};