import UserModel from "../models/user.model.js";
import UserTokenModel from "../models/userToken.model.js";
import eventBus from "../events/eventBus.js";
import { AppError } from "../utils/errors.js";
import { generateRandomToken, hashToken } from "../utils/token.service.js";

export const requestAccountRecoveryController = async (req, res) => {
  const { email } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (!email) {
      throw new AppError("Email is required", 400, "invalid_request");
    }

    const user = await UserModel.findOne({
      deletedEmail: email
    });

    if (!user) {
      throw new AppError("Account not found", 404, "account_not_found");
    }

    const activeUser = await UserModel.findOne({
      email,
      deletedAt: null
    });

    if (activeUser) {
      throw new AppError("Email already in use", 400, "email_in_use");
    }

    await UserTokenModel.updateMany(
      {
        userId: user._id,
        type: "ACCOUNT_RECOVERY",
        consumedAt: null
      },
      { consumedAt: new Date() }
    );

    const rawToken =generateRandomToken()

    const tokenHash =hashToken(rawToken)

    await UserTokenModel.create({
      userId: user._id,
      type: "ACCOUNT_RECOVERY",
      tokenHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ip,
      userAgent
    });

    eventBus.emit("user.recovery.requested", {
      userId: user._id,
      email,
      ip,
      userAgent,
      status: "success",
      message: "Recovery requested",
      metadata: {
        action: "ACCOUNT_RECOVERY_REQUEST",
        targetUserId: user._id
      }
    });

    return res.json({
      message: "Recovery initiated",
      recoveryToken: rawToken 
    });

  } catch (error) {

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("user.recovery.request.error", {
      email,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};


export const confirmAccountRecoveryController = async (req, res) => {
  const { token } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (!token) {
      throw new AppError("Token required", 400, "invalid_request");
    }

    const tokenHash =hashToken(token)

    const recovery = await UserTokenModel.findOne({
      tokenHash,
      type: "ACCOUNT_RECOVERY",
      consumedAt: null,
      expiresAt: { $gt: new Date() }
    });

    if (!recovery) {
      throw new AppError(
        "Invalid or expired token",
        400,
        "invalid_or_expired_token"
      );
    }

    const user = await UserModel.findById(recovery.userId);

    if (!user) {
      throw new AppError("User not found", 404, "user_not_found");
    }

    const existing = await UserModel.findOne({
      email: user.deletedEmail,
      deletedAt: null
    });

    if (existing) {
      throw new AppError("Email already in use", 400, "email_in_use");
    }

    const before = {
      status: user.status,
      deletedAt: user.deletedAt,
      email: user.email
    };

    user.email = user.deletedEmail;
    user.deletedEmail = null;
    user.deletedAt = null;
    user.status = "ACTIVE";

    await user.save();

    recovery.consumedAt = new Date();
    await recovery.save();

    const after = {
      status: user.status,
      deletedAt: user.deletedAt,
      email: user.email
    };

    eventBus.emit("user.recovered", {
      userId: user._id,
      ip,
      userAgent,
      status: "success",
      message: "Account recovered",
      metadata: {
        action: "ACCOUNT_RECOVERY_CONFIRM",
        targetUserId: user._id,
        changes: { before, after }
      }
    });

    return res.json({ message: "Account recovered" });

  } catch (error) {

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("user.recovery.confirm.error", {
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};