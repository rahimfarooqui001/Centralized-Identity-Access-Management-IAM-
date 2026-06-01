import eventBus from "../events/eventBus.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";




export const assignUserToAppController = async (req, res) => {
  const { userId, appId, roleIds } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const existing = await UserAppAccessModel.findOne({ userId, appId }).lean();

    const before = existing
      ? {
          roleIds: existing.roleIds,
          status: existing.status
        }
      : null;

    const access = await UserAppAccessModel.findOneAndUpdate(
      { userId, appId },
      {
        roleIds,
        status: "ACTIVE",
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    const after = {
      roleIds: access.roleIds,
      status: access.status
    };

    eventBus.emit("user.app.assigned", {
      userId: actorUserId, 

      appId,
      ip,
      userAgent,
      status: "success",
      message: "User assigned/updated in application",

      metadata: {
        actorUserId,
        targetUserId: userId,
        action: "ASSIGN_USER_TO_APP",
        resourceType: "UserAppAccess",
        resourceId: access._id,

        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "Access assigned",
      access
    });

  } catch (error) {
    eventBus.emit("user.app.assign.error", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        targetUserId: userId,
        action: "ASSIGN_USER_TO_APP"
      }
    });

    return res.status(500).json({ error: "server_error" });
  }
};










export const removeUserFromAppController = async (req, res) => {
  const { userId, appId } = req.body;

  const actorUserId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const access = await UserAppAccessModel.findOne({
      userId,
      appId
    });

    if (!access) {
      return res.status(404).json({
        error: "access_not_found"
      });
    }

    if (access.status === "REVOKED") {
      return res.status(400).json({
        error: "access_already_revoked"
      });
    }

    const before = {
      roleIds: access.roleIds,
      status: access.status
    };

    access.status = "REVOKED";

    await access.save();

    const after = {
      roleIds: access.roleIds,
      status: access.status
    };

    eventBus.emit("user.app.removed", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "success",
      message: "User access revoked from application",

      metadata: {
        actorUserId,
        targetUserId: userId,

        action: "REVOKE_APP_ACCESS",

        resourceType: "UserAppAccess",
        resourceId: access._id,

        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "User access revoked"
    });

  } catch (error) {

    eventBus.emit("user.app.remove.error", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        targetUserId: userId,
        action: "REVOKE_APP_ACCESS"
      }
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};





export const recoverUserAppAccessController = async (req, res) => {

  const {
    userId,
    appId
  } = req.body;

  const actorUserId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const access = await UserAppAccessModel.findOne({
      userId,
      appId
    });

    if (!access) {
      return res.status(404).json({
        error: "access_not_found"
      });
    }

    if (access.status === "ACTIVE") {
      return res.status(400).json({
        error: "access_already_active"
      });
    }

    if (!access.roleIds.length) {
      return res.status(400).json({
        error: "cannot_recover_access_without_roles"
      });
    }

    const before = {
      status: access.status
    };

    access.status = "ACTIVE";

    await access.save();

    const after = {
      status: access.status
    };

    eventBus.emit("user.app.access.recovered", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "success",
      message: "User app access recovered",

      metadata: {
        actorUserId,
        targetUserId: userId,
        resourceId: access._id,

        action: "RECOVER_APP_ACCESS",

        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "User app access recovered"
    });

  } catch (error) {

    eventBus.emit("user.app.access.recover.error", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        targetUserId: userId,
        action: "RECOVER_APP_ACCESS"
      }
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};