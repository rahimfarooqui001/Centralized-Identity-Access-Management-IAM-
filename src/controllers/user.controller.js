import bcrypt from "bcrypt";
import eventBus from "../events/eventBus.js";

import UserModel from "../models/user.model.js";
import { ensureUserHasNoActiveAccess } from "../utils/user.guard.js";
import { ensureNotLastAdmin } from "../utils/admin.helper.js";
import { deleteAllUserSessions, getUserSessions, isSessionOwnedByUser, removeUserSession } from "../utils/session.service.js";





export const registerUserController = async (req, res) => {
  const {  name,email, password } = req.body;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (!email || !password || !name) {
      return res.status(400).json({ error: "invalid_request" });
    }

    const exists = await UserModel.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: "email_exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await UserModel.create({
       name,
      email,
      passwordHash
    });

    eventBus.emit("user.created", {
      userId: user._id,
      email,
       name,
      ip,
      userAgent,
      status: "success"
    });

    return res.status(201).json({
      message: "User created",
      userId: user._id
    });

  } catch (error) {
    eventBus.emit("user.create.error", {
       name,
      email,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};







export const getMeController = async (req, res) => {
  try {
    const user = await UserModel.findById(req.session.userId)
      .select("email status createdAt");

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    return res.json(user);

  } catch {
    return res.status(500).json({ error: "server_error" });
  }
};


export const updateMeController = async (req, res) => {
  const { email, password, name } = req.body;

  const userId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (email) user.email = email;
        if (name) user.name = name;

    if (password) {
      user.passwordHash = await bcrypt.hash(password, 12);
    }

    await user.save();

    eventBus.emit("user.self.updated", {
      userId,
      email,
      name,
      ip,
      userAgent,
      status: "success"
    });

    return res.json({ message: "Profile updated" });

  } catch (error) {
    eventBus.emit("user.self.update.error", {
      userId,
      email,
      name,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};



export const deleteMeController = async (req, res) => {
  const userId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const user = await UserModel.findById(userId);

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "user_not_found" });
    }

    await ensureUserHasNoActiveAccess(userId);
    await ensureNotLastAdmin(userId);

    const before = {
      status: user.status,
      deletedAt: user.deletedAt,
      email: user.email
    };

    const originalEmail = user.email;
    const shortId = user._id.toString().slice(-6);

    user.deletedEmail = originalEmail;
    user.email = `deleted_${shortId}_${originalEmail}`;

    user.deletedAt = new Date();
    user.status = "DISABLED";

    await user.save();

    const after = {
      status: user.status,
      deletedAt: user.deletedAt,
      email: user.email
    };

    eventBus.emit("user.self.deleted", {
      userId,
      ip,
      userAgent,
      status: "success",
      message: "User self deleted",
      metadata: {
        actorUserId: userId,
        targetUserId: userId,
        action: "SELF_DELETE",
        changes: { before, after }
      }
    });

    return res.json({ message: "Account deleted" });

  } catch (error) {

    if (error.code) {
      return res.status(error.statusCode).json({
        error: error.code,
        ...(error.metadata && { ...error.metadata })
      });
    }

    eventBus.emit("user.self.delete.error", {
      userId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};





export const listSessionsController = async (req, res) => {
  const userId = req.session.userId;

  try {
    const client = req.sessionStore.client;

    const sessionIds = await getUserSessions(userId);

    const sessions = [];

    for (const sessionId of sessionIds) {
      const data = await client.get(`sess:${sessionId}`);
      if (!data) continue;

      const session = JSON.parse(data);

      sessions.push({
        sessionId,
        createdAt: session.createdAt,
        ip: session.ip,
        userAgent: session.userAgent
      });
    }

    return res.json({ sessions });

  } catch {
    return res.status(500).json({ error: "server_error" });
  }
};

export const logoutController = async (req, res) => {
  const userId = req.session.userId;
  const sessionId = req.sessionID;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    await removeUserSession(userId, sessionId);

    await req.session.destroy(() => {});

    eventBus.emit("auth.logout.success", {
      userId,
      ip,
      userAgent,
      status: "success",
      metadata: {
        sessionId
      }
    });

    return res.json({ message: "Logged out successfully" });

  } catch (error) {
    eventBus.emit("auth.logout.failed", {
      userId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};

export const revokeSessionController = async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const isOwner = await isSessionOwnedByUser(userId, sessionId);

    if (!isOwner) {
      return res.status(404).json({ error: "session_not_found" });
    }

    await req.sessionStore.client.del(`sess:${sessionId}`);
    await removeUserSession(userId, sessionId);

    eventBus.emit("session.revoked", {
      userId,
      ip,
      userAgent,
      status: "success",
      metadata: {
        sessionId
      }
    });

    return res.json({ message: "Session revoked" });

  } catch (error) {
    eventBus.emit("session.revoked_failed", {
      userId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,
      metadata: { sessionId }
    });

    return res.status(500).json({ error: "server_error" });
  }
};


export const revokeOtherSessionsController = async (req, res) => {
  const userId = req.session.userId;
  const currentSessionId = req.sessionID;

  try {
    const client = req.sessionStore.client;

    const sessionIds = await getUserSessions(userId);

    for (const sid of sessionIds) {
      if (sid === currentSessionId) continue;

      await client.del(`sess:${sid}`);
      await removeUserSession(userId, sid);
    }

    return res.json({ message: "Other sessions revoked" });

  } catch {
    return res.status(500).json({ error: "server_error" });
  }
};

export const logoutAllController = async (req, res) => {
  const userId = req.session.userId;

  try {
    const client = req.sessionStore.client;

    const sessionIds = await getUserSessions(userId);

    for (const sid of sessionIds) {
      await client.del(`sess:${sid}`);
    }

    await deleteAllUserSessions(userId);

    return res.json({ message: "All sessions logged out" });

  } catch {
    return res.status(500).json({ error: "server_error" });
  }
};