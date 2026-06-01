


import ApplicationModel from "../models/application.model.js";
import PermissionModel from "../models/permission.model.js";
import UserModel from "../models/user.model.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";
import {
  consumeAuthorizationCode,
  validateAuthorizationCode
} from "../utils/authCode.js";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
  revokeAllUserSessions,
  RevokeReason,
  rotateRefreshToken
} from "../utils/token.service.js";
import env from "../config/env.js";
import refreshTmodel from "../models/refreshToken.model.js";
import { resolveUserAppPermissions } from "../utils/permission.service.js";
import logger from "../logger/index.js";
import mongoose from "mongoose";
import AuditLogModel from "../models/auditLog.model.js";
import eventBus from "../events/eventBus.js";


export const tokenController = async (req, res) => {
  const {
    grant_type,
    client_id,
    client_secret,
    code,
    redirect_uri
  } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (grant_type !== "authorization_code") {
      return res.status(400).json({
        error: "unsupported_grant_type"
      });
    }

    if (!client_id || !client_secret || !code || !redirect_uri) {
      return res.status(400).json({
        error: "invalid_request",
        message: "Missing required parameters"
      });
    }

    const app = await ApplicationModel.findOne({
      clientId: client_id,
      status: "ACTIVE"
    });

    if (!app) {
      return res.status(401).json({
        error: "invalid_client"
      });
    }

    const isValidSecret = await bcrypt.compare(
      client_secret,
      app.clientSecretHash
    );

    if (!isValidSecret) {
    

      return res.status(401).json({
        error: "invalid_client"
      });
    }

    const authCode = await validateAuthorizationCode({
      code,
      clientAppId: app._id,
      redirectUri: redirect_uri
    });

    const user = await UserModel.findById(authCode.userId);

    if (!user) {
      return res.status(401).json({
        error: "invalid_grant"
      });
    }

    await consumeAuthorizationCode(authCode);

    const access = await UserAppAccessModel.findOne({
      userId: user._id,
      appId: app._id,
      status: "ACTIVE"
    }).populate("roleIds");

    if (!access) {
      eventBus.emit("auth.access.denied", {
        userId: user._id,
        appId: app._id,
        ip,
        userAgent,
        status: "failure",
        reason: "access_denied"
      });

      return res.status(403).json({
        error: "access_denied"
      });
    }

    const permissionIds = access.roleIds.flatMap(
      role => role.permissionIds
    );

    const permissions = await PermissionModel.find({
      _id: { $in: permissionIds },
      status: "ACTIVE"
    });
    console.log(permissions,' fro token con')

    const permissionKeys = permissions.map(p => p.key);

    if (!permissions) {
  return res.status(403).json({
    error: "no_active_permissions",
    message: "User has no active permissions"
  });
}

    const accessToken = createAccessToken({
      userId: user._id,
      appId: app._id,
      permissions: permissionKeys
    });

    const refreshToken = await createRefreshToken({
      userId: user._id,
      appId: app._id,
      ip,
      userAgent
    });

    const isProd = env.nodeEnv === "production";

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/oauth",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    eventBus.emit("auth.token.issued", {
      userId: user._id,
      appId: app._id,
      ip,
      userAgent,
      status: "success",
      message: "Access and refresh tokens issued"
    });

    return res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 900
    });

  } catch (error) {

    if (error.code) {
      return res.status(error.statusCode || 400).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("auth.token.error", {
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};
 
export const listUserSessionsController = async (req, res) => {
  try {
    const { userId, appId } = req.user;

    

    const sessions = await refreshTmodel.find({
      userId,
      appId,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    })
      .select("_id ip userAgent createdAt lastUsedAt expiresAt")
      .sort({ lastUsedAt: -1 });

    eventBus.emit("session.viewed", {
      message: "User viewed active sessions",
      userId,
      appId,
      sessionCount: sessions.length,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      status: "success"
    });

    return res.json({ sessions });

  } catch (error) {
    console.error("List sessions error:", error);

    return res.status(500).json({
      error: "server_error",
      message: "Failed to fetch sessions"
    });
  }
};



export const revokeSessionController = async (req, res) => {
  try {
    const { userId, appId } = req.user;



    const sessionId = req.params.sessionId;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({
        error: "invalid_request",
        message: "Invalid session id"
      });
    }

    const session = await refreshTmodel.findOneAndUpdate(
      {
        _id: sessionId,
        userId,
        appId,
        revokedAt: null
      },
      {
        revokedAt: new Date()
      },
      { new: true }
    );

    if (!session) {

      eventBus.emit("session.revoked_failed", {
        message: "Failed to revoke session (not found or already revoked)",
        userId,
        appId,
        sessionId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        status: "failure",
        reason: "not_found_or_already_revoked"
      });

      return res.status(404).json({
        error: "not_found",
        message: "Session not found"
      });
    }

    eventBus.emit("session.revoked", {
      message: "Session revoked successfully",
      userId,
      appId,
      sessionId: session._id,
      revokedAt: session.revokedAt,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      status: "success"
    });

    return res.json({
      message: "Session revoked successfully"
    });

  } catch (error) {
    console.error("Revoke session error:", error);

    return res.status(500).json({
      error: "server_error",
      message: "Failed to revoke session"
    });
  }
};





const refreshCookieOptions = () => {
  const isProd = env.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: env.refreshCookiePath ?? "/oauth",
  };
};

const clearRefreshCookie = (res) =>
  res.clearCookie("refreshToken", refreshCookieOptions());

const setRefreshCookie = (res, token) =>
  res.cookie("refreshToken", token, {
    ...refreshCookieOptions(),
    maxAge: REFRESH_TOKEN_TTL_MS,
  });

export const refreshTokenController = async (req, res) => {
  const ip = req.ip;
  const userAgent = req.headers["user-agent"] ?? "unknown";
  const rawRefreshToken = req.cookies?.refreshToken;

  try {
    if (!rawRefreshToken) {
      eventBus.emit("auth.refresh.failed", {
        message: "Missing refresh token",
        ip,
        userAgent,
        status: "failure",
        reason: "missing_token",
      });

      return res.status(401).json({
        error: "invalid_request",
        message: "Refresh token missing",
      });
    }

    let rotation;
    try {
      rotation = await rotateRefreshToken({
        token: rawRefreshToken,
        ip,
        userAgent,
      });
    } catch (err) {
      clearRefreshCookie(res);

      eventBus.emit("auth.refresh.failed", {
        message: "Refresh token rotation failed",
        ip,
        userAgent,
        status: "failure",
        reason: err.code || "refresh_failed",
      });

      return res.status(err.statusCode || 401).json({
        error: err.code,
        message: err.message,
      });
    }

    const { rawToken, userId, appId } = rotation;

    let permissions;
    try {
      permissions = await resolveUserAppPermissions({ userId, appId });
    } catch {
      await revokeAllUserSessions(
        { userId, appId },
        RevokeReason.ACCESS_REVOKED
      );

      clearRefreshCookie(res);

      eventBus.emit("auth.refresh.failed", {
        userId,
        appId,
        message: "Access revoked during refresh",
        status: "failure",
        reason: "access_revoked",
      });

      return res.status(403).json({
        error: "access_denied",
      });
    }

    const accessToken = createAccessToken({
      userId,
      appId,
      permissions,
    });

    setRefreshCookie(res, rawToken);

    eventBus.emit("auth.refresh.success", {
      userId,
      appId,
      ip,
      userAgent,
      message: "Refresh token successful",
      status: "success",
    });

    return res.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 900,
    });

  } catch (error) {
    eventBus.emit("auth.refresh.error", {
      message: "Unexpected refresh error",
      ip,
      userAgent,
      status: "failure",
      reason: error.message,
    });

    return res.status(500).json({
      error: "server_error",
    });
  }
};