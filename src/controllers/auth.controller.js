import PermissionModel from "../models/permission.model.js";
import UserModel from "../models/user.model.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";
import ApplicationModel from "../models/application.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import env from "../config/env.js";
import mongoose from "mongoose";
import { createAccessToken, createRefreshToken, generateRandomToken, hashToken, revokeAllUserSessions, RevokeReason, revokeRefreshToken, rotateRefreshToken } from "../utils/token.service.js";
import { createAuthorizationCode } from "../utils/authCode.js";
import logger from "../logger/index.js";
import AuditLogModel from "../models/auditLog.model.js";
import { auditQueue } from "../queues/audit.queue.js";
import eventBus from "../events/eventBus.js";
import refreshTmodel from "../models/refreshToken.model.js";
import { AppError } from "../utils/errors.js";
import UserTokenModel from "../models/userToken.model.js";
import { addUserSession } from "../utils/session.service.js";
import { createAuthzCode } from "../utils/authorizationCode.redis.js";


export const login = async (req, res) => {
  const { email, password } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const user = await UserModel.findOne({ email, status: "ACTIVE" });
  

    if (!user) {
      eventBus.emit("auth.login.failed", {
        userId: null,
        email,
        message: "Login failed",
        ip,
        userAgent,
        status: "failure",
        reason: "invalid_credentials"
      });

      return res.status(401).json({ message: "Invalid credentials" });
    }
//     console.log({
//   enteredPassword: JSON.stringify(password),
//   storedHash: user.passwordHash
// });

const isvalid = await bcrypt.compare(
  password.trim(),
  user.passwordHash
);

// console.log("VALID:", isvalid);
// console.log({
//   password,
//   hash: user.passwordHash
// });
    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      eventBus.emit("auth.login.failed", {
        userId: user._id,
        email,
        message: "Login failed",
        ip,
        userAgent,
        status: "failure",
        reason: "invalid_credentials"
      });

      console.log("password failed")
      return res.status(401).json({ message: "Invalid credentials" });
    }

   req.session.userId = user._id.toString();
req.session.createdAt = new Date();
req.session.ip = ip;
req.session.userAgent = userAgent

await new Promise((resolve, reject) => {
  req.session.save(err => (err ? reject(err) : resolve()));
});
await addUserSession(user._id.toString(), req.sessionID);

    eventBus.emit("auth.login.success", {
      userId: user._id,
      email: user.email,
      message: "User logged in",
      ip,
      userAgent,
      status: "success"
    });

    eventBus.emit("session.created", {
      userId: user._id,
      message: "Session created",
      ip,
      userAgent,
      status: "success",
      metadata: {
        sessionId: req.sessionID
      }
    });

    return res.json({ message: "Login successful" });

  } catch (error) {
    console.error("LOGIN ERROR:", error); 
    eventBus.emit("auth.login.failed", {
      userId: null,
      email,
      message: "Login failed",
      ip,
      userAgent,
      status: "failure",
      reason: "server_error"
    });

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};

export const getMyApps = async (req, res) => {
  const userId = req.session.userId;
  console.log(req.session)

  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const accesses = await UserAppAccessModel.find({
    userId,
    status: "ACTIVE"
  }).populate("appId");

  const apps = accesses.map(access => ({
    appId: access.appId._id,
    name: access.appId.name,
    appKey: access.appId.appKey,
    redirectUri: access.appId.defaultRedirectUri
  }));

  return res.json(apps);
};







// export const selectApp = async (req, res) => {
//   const userId = req.session?.userId;
//   const { appId, state } = req.body;

//   const ip = req.ip;
//   const userAgent = req.headers["user-agent"];

//   try {
//     if (!userId) {
//       eventBus.emit("auth.select_app.failed", {
//         userId: null,
//         appId,
//         message: "App selection failed",
//         ip,
//         userAgent,
//         status: "failure",
//         reason: "unauthenticated"
//       });

//       return res.status(401).json({ message: "Not authenticated" });
//     }

//     const access = await UserAppAccessModel.findOne({
//       userId,
//       appId: new mongoose.Types.ObjectId(appId),
//       status: "ACTIVE"
//     }).populate("appId");

//     if (!access) {
//       eventBus.emit("auth.select_app.failed", {
//         userId,
//         appId,
//         message: "App selection failed",
//         ip,
//         userAgent,
//         status: "failure",
//         reason: "access_denied"
//       });

//       return res.status(403).json({ message: "Access denied" });
//     }

//     const app = access.appId;

//     const code = await createAuthorizationCode({
//       userId,
//       appId: app._id,
//       redirectUri: app.defaultRedirectUri
//     });

//     const redirectUrl = new URL(app.defaultRedirectUri);
//     redirectUrl.searchParams.append("code", code);

//     if (state) {
//       redirectUrl.searchParams.append("state", state);
//     }

//     eventBus.emit("auth.select_app.success", {
//       userId,
//       appId: app._id,
//       message: "Application selected and authorization started",
//       ip,
//       userAgent,
//       status: "success"
//     });

//     return res.redirect(redirectUrl.toString());

//   } catch (error) {
//     eventBus.emit("auth.select_app.failed", {
//       userId: userId || null,
//       appId,
//       message: "App selection failed",
//       ip,
//       userAgent,
//       status: "failure",
//       reason: "server_error"
//     });

//     return res.status(500).json({
//       message: "Failed to select application"
//     });
//   }
// };




export const selectApp = async (req, res) => {
  const userId = req.session?.userId;
  const { appId } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (!userId) {
      eventBus.emit("auth.select_app.failed", {
        userId: null,
        appId,
        message: "App selection failed",
        ip,
        userAgent,
        status: "failure",
        reason: "unauthenticated",
      });

      return res.status(401).json({ message: "Not authenticated" });
    }

    const access = await UserAppAccessModel.findOne({
      userId,
      appId: new mongoose.Types.ObjectId(appId),
      status: "ACTIVE",
    }).populate("appId");

    if (!access) {
      eventBus.emit("auth.select_app.failed", {
        userId,
        appId,
        message: "App selection failed",
        ip,
        userAgent,
        status: "failure",
        reason: "access_denied",
      });

      return res.status(403).json({ message: "Access denied" });
    }

    const app = access.appId;

    const code = await createAuthzCode({
      userId,
      appId: app._id.toString(),
      redirectUri: app.defaultRedirectUri,
      ttlSeconds: 120,
    });

    const redirectUrl = new URL(app.defaultRedirectUri);
    redirectUrl.searchParams.append("code", code);

    eventBus.emit("auth.select_app.success", {
      userId,
      appId: app._id,
      message: "Authorization code issued",
      ip,
      userAgent,
      status: "success",
    });

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    eventBus.emit("auth.select_app.failed", {
      userId: userId || null,
      appId,
      message: "App selection failed",
      ip,
      userAgent,
      status: "failure",
      reason: "server_error",
    });

    return res.status(500).json({
      message: "Failed to select application",
    });
  }
};


export const logout = async (req, res) => {
  try {
    const rawToken = req.cookies?.refreshToken;

    if (!rawToken) {

      eventBus.emit("auth.logout.failed", {
        message: "Logout failed - refresh token missing",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
        status: "failure",
        reason: "no_refresh_token"
      });

      return res.status(401).json({
        error: "invalid_request",
        message: "Refresh token not found"
      });
    }

    const session = await revokeRefreshToken(rawToken); 

    const isProd = env.nodeEnv === "production";

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/oauth"
    });

    eventBus.emit("auth.logout.success", {
      message: "User logged out successfully",
      userId: session?.userId,     
      appId: session?.appId,       
      sessionId: session?._id,     
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      status: "success"
    });

    return res.status(200).json({
      message: "Logged out successfully"
    });

  } catch (error) {

    eventBus.emit("auth.logout.failed", {
      message: "Logout failed due to server error",
      error: error.message,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      status: "failure"
    });

    return res.status(500).json({
      error: "server_error",
      message: "Logout failed"
    });
  }
};




export const logoutAllSessionsController = async (req, res) => {
  try {
    const { userId, appId } = req.user;

  

    await revokeAllUserSessions({ userId, appId});

    const isProd = env.nodeEnv === "production";

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/oauth"
    });

    eventBus.emit("session.revoked_all", {
      message: "All user sessions revoked",
      userId,
      appId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      status: "success"
    });

    return res.json({
      message: "All sessions revoked"
    });

  } catch (error) {

    eventBus.emit("session.revoked_all.failed", {
      message: "Logout all sessions failed",
      error: error.message,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      status: "failure"
    });

    return res.status(500).json({
      error: "server_error",
      message: "Failed to revoke sessions"
    });
  }
};






export const revokeTokenController = async (req, res) => {
  const { token, revoke_all } = req.body;

  if (revoke_all !== undefined && typeof revoke_all !== "boolean") {
  return res.status(400).json({
    error: "invalid_request",
    message: "revoke_all must be a boolean"
  });
}

  const ip = req.ip;
  const userAgent = req.headers["user-agent"] ?? "unknown";

  try {
    if (!token) {
      return res.status(200).json({ success: true });
    }

    const tokenHash = hashToken(token);

    const existingToken = await refreshTmodel.findOne({ tokenHash });

    if (existingToken && !existingToken.revokedAt) {
      const { userId, appId } = existingToken;

      if (revoke_all === true) {
        await revokeAllUserSessions(
          { userId, appId },
          RevokeReason.MANUAL_LOGOUT
        );

        eventBus.emit("auth.token.revoke_all", {
          userId,
          appId,
          ip,
          userAgent,
          status: "success",
          message: "All sessions revoked via OAuth revoke endpoint"
        });

      } else {

        await revokeRefreshToken(token);

        eventBus.emit("auth.token.revoked", {
          userId,
          appId,
          ip,
          userAgent,
          status: "success",
          message: "Refresh token revoked via OAuth revoke endpoint"
        });
      }
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    eventBus.emit("auth.token.revoke.error", {
      ip,
      userAgent,
      status: "failure",
      message: "Unexpected error during token revocation",
      reason: error.message,
      metadata: {
        stack: error.stack
      }
    });

    return res.status(200).json({ success: true });
  }
};




export const requestPasswordResetController = async (req, res) => {
  const { email } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (!email) {
      throw new AppError("Email required", 400, "invalid_request");
    }

    const user = await UserModel.findOne({
      email,
      deletedAt: null,
      status: "ACTIVE"
    });

    if (!user) {
      return res.json({ message: "If account exists, reset link sent" });
    }

    await UserTokenModel.updateMany(
      {
        userId: user._id,
        type: "PASSWORD_RESET",
        consumedAt: null
      },
      { consumedAt: new Date() }
    );

    const rawToken = generateRandomToken()

    const tokenHash = hashToken(rawToken)

    await UserTokenModel.create({
      userId: user._id,
      type: "PASSWORD_RESET",
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ip,
      userAgent
    });

    eventBus.emit("user.password.reset.requested", {
      userId: user._id,
      email,
      ip,
      userAgent,
      status: "success",
      message: "Password reset requested",
      metadata: {
        action: "PASSWORD_RESET_REQUEST",
        targetUserId: user._id
      }
    });

    return res.json({
      message: "Reset initiated",
      resetToken: rawToken 
    });

  } catch (error) {

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("user.password.reset.request.error", {
      email,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};







export const confirmPasswordResetController = async (req, res) => {
  const { token, newPassword } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (!token || !newPassword) {
      throw new AppError("Invalid request", 400, "invalid_request");
    }

    if (newPassword.length < 6) {
      throw new AppError("Weak password", 400, "weak_password");
    }

    const tokenHash = hashToken(token)

    const reset = await UserTokenModel.findOne({
      tokenHash,
      type: "PASSWORD_RESET",
      consumedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!reset) {
      throw new AppError(
        "Invalid or expired token",
        400,
        "invalid_or_expired_token"
      );
    }

    const user = await UserModel.findById(reset.userId);

    if (!user || user.deletedAt) {
      throw new AppError("User not found", 404, "user_not_found");
    }

    const before = {
      passwordHash: user.passwordHash
    };

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    reset.consumedAt = new Date();
    await reset.save();

    const after = {
      passwordHash: "UPDATED"
    };

    eventBus.emit("user.password.reset.completed", {
      userId: user._id,
      ip,
      userAgent,
      status: "success",
      message: "Password reset successful",
      metadata: {
        action: "PASSWORD_RESET_CONFIRM",
        targetUserId: user._id,
        changes: { before, after }
      }
    });

    return res.json({ message: "Password updated" });

  } catch (error) {

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("user.password.reset.confirm.error", {
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};
