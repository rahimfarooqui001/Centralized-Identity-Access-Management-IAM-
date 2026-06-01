//  controllers/admin.controller.js
import eventBus from "../events/eventBus.js";
import UserModel from "../models/user.model.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";
import UserSystemRoleModel from "../models/userSystemRole.model.js";

import { countAdmins, ensureNotLastAdmin, hasAdminRole, isUserAdmin } from "../utils/admin.helper.js";
import { AppError } from "../utils/errors.js";
import { buildPagination, buildQuery, buildSort } from "../utils/query.util.js";
import { getSystemRoleIds } from "../utils/systemRole.helper.js";
import { ensureUserHasNoActiveAccess } from "../utils/user.guard.js";






export const promoteToAdminController = async (req, res) => {
  const actorUserId = req.session.userId;
  const targetUserId = req.params.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const roles = await getSystemRoleIds();

    const targetUser = await UserModel.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (targetUser.status !== "ACTIVE") {
      return res.status(400).json({
        error: "cannot_promote_disabled_user"
      });
    }

    const alreadyAdmin = await isUserAdmin(targetUserId);

    if (alreadyAdmin) {
      return res.status(400).json({ error: "already_admin" });
    }

    await UserSystemRoleModel.create({
      userId: targetUserId,
      roleId: roles.ADMIN,
      assignedBy: actorUserId
    });

    eventBus.emit("admin.user.promoted", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "User promoted to admin",
      metadata: {
        actorUserId,
        targetUserId,
        action: "PROMOTE_TO_ADMIN"
      }
    });

    return res.json({ message: "User promoted to admin" });

  } catch (error) {

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("admin.user.promote.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,
      metadata: { targetUserId }
    });

    return res.status(500).json({ error: "server_error" });
  }
};



export const demoteAdminController = async (req, res) => {
  const actorUserId = req.session.userId;
  const targetUserId = req.params.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const roles = await getSystemRoleIds();

    const targetUser = await UserModel.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // ✅ Check raw admin role (IMPORTANT)
    const hasRole = await hasAdminRole(targetUserId);

    if (!hasRole) {
      return res.status(400).json({ error: "not_admin" });
    }

    if (targetUser.status !== "ACTIVE") {
      return res.status(400).json({
        error: "cannot_demote_disabled_user"
      });
    }

    const isActiveAdmin = await isUserAdmin(targetUserId);

    if (isActiveAdmin) {
      await ensureNotLastAdmin(targetUserId);
    }

    await UserSystemRoleModel.deleteOne({
      userId: targetUserId,
      roleId: roles.ADMIN
    });

    eventBus.emit("admin.user.demoted", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Admin demoted",
      metadata: {
        actorUserId,
        targetUserId,
        action: "DEMOTE_ADMIN",
        context: {
          targetStatus: targetUser.status,
          wasActiveAdmin: isActiveAdmin
        }
      }
    });

    return res.json({ message: "Admin demoted to user" });

  } catch (error) {

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("admin.user.demote.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,
      metadata: { targetUserId }
    });

    return res.status(500).json({ error: "server_error" });
  }
};



export const listUsersController = async (req, res) => {

  try {
    const { page, limit, skip } = buildPagination(req.query);

    const allowedFields = ["email", "status", "createdAt"];

    const filter = {
      deletedAt: null,
      ...buildQuery(req.query, allowedFields)
    };

    const sort = buildSort(req.query, allowedFields);

    const [users, total] = await Promise.all([
      UserModel.find(filter)
        .select("email status createdAt")
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),

      UserModel.countDocuments(filter)
    ]);

    return res.json({
      data: users,
      pagination: { total, page, limit }
    });

  } catch {
    return res.status(500).json({ error: "server_error" });
  }
};


export const getUserController = async (req, res) => {

  try {
    const user = await UserModel.findOne({
      _id: req.params.userId,
      deletedAt: null
    }).select("email status createdAt");

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

  

    return res.json(user);

  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
};


export const updateUserController = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const user = await UserModel.findById(userId);

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (status && !["ACTIVE", "DISABLED"].includes(status)) {
      return res.status(400).json({
        error: "invalid_status"
      });
    }

    if (
      userId === actorUserId.toString() &&
      status === "DISABLED"
    ) {
      return res.status(400).json({
        error: "cannot_disable_self"
      });
    }

    const isAdmin = await isUserAdmin(userId);

    if (status === "DISABLED" && isAdmin) {
      await ensureNotLastAdmin(userId);
    }

    const before = {
      status: user.status
    };

    if (status) user.status = status;

    await user.save();

    const after = {
      status: user.status
    };

    eventBus.emit("user.updated", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "User status updated",

      metadata: {
        actorUserId,
        targetUserId: userId,
        action: "UPDATE_USER_STATUS",

        changes: {
          before,
          after
        },

        context: {
          targetWasAdmin: isAdmin,
          statusChange: {
            from: before.status,
            to: after.status
          }
        }
      }
    });

    return res.json({ message: "User updated" });

  } catch (error) {

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("user.update.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        targetUserId: userId,
        attemptedChanges: { status }
      }
    });

    return res.status(500).json({ error: "server_error" });
  }
};





export const deleteUserController = async (req, res) => {
  const { userId } = req.params;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const user = await UserModel.findById(userId);

    if (!user || user.deletedAt) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (userId === actorUserId.toString()) {
      return res.status(400).json({ error: "cannot_delete_self" });
    }

    await ensureNotLastAdmin(userId);
    await ensureUserHasNoActiveAccess(userId);

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

    eventBus.emit("user.deleted", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "User soft deleted",
      metadata: {
        actorUserId,
        targetUserId: userId,
        action: "DELETE_USER",
        changes: { before, after }
      }
    });

    return res.json({ message: "User deleted" });

  } catch (error) {

    if (error.code) {
      return res.status(error.statusCode).json({
        error: error.code,
        ...(error.metadata && { ...error.metadata })
      });
    }

    eventBus.emit("user.delete.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,
      metadata: { actorUserId, targetUserId: userId }
    });

    return res.status(500).json({ error: "server_error" });
  }
};