import RoleModel from "../models/role.model.js";
import PermissionModel from "../models/permission.model.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";

import eventBus from "../events/eventBus.js";

import {
  buildPagination,
  buildQuery,
  buildSort
} from "../utils/query.util.js";




export const createRoleController = async (req, res) => {
  const { appId, name, permissionIds = [] } = req.body;

  const actorUserId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const permissions = await PermissionModel.find({
      _id: { $in: permissionIds },
      appId,
      status: "ACTIVE",
      deletedAt: null
    });

    if (permissions.length !== permissionIds.length) {
      return res.status(400).json({
        error: "invalid_permissions"
      });
    }

    const role = await RoleModel.create({
      appId,
      name,
      permissionIds
    });

    eventBus.emit("role.created", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Role created",

      metadata: {
        actorUserId,
        roleId: role._id,
        appId,
        action: "CREATE_ROLE"
      }
    });

    return res.status(201).json({
      message: "Role created",
      role
    });

  } catch (error) {

    eventBus.emit("role.create.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        appId,
        action: "CREATE_ROLE"
      }
    });

    if (error.code === 11000) {
      return res.status(400).json({
        error: "role_already_exists"
      });
    }

    return res.status(500).json({
      error: "server_error"
    });
  }
};




export const getRoleController = async (req, res) => {
  const { roleId } = req.params;

  try {

    const role = await RoleModel.findOne({
      _id: roleId,
      deletedAt: null
    }).populate("permissionIds");

    if (!role) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    return res.json({ role });

  } catch {
    return res.status(500).json({
      error: "server_error"
    });
  }
};




export const listRolesController = async (req, res) => {

  try {

    const filter = buildQuery(
      req.query,
      ["name", "status", "createdAt"]
    );

    filter.deletedAt = null;

    const { page, limit, skip } =
      buildPagination(req.query);

    const sort = buildSort(
      req.query,
      ["createdAt", "name"]
    );

    const [roles, total] = await Promise.all([
      RoleModel.find(filter)
        .populate("permissionIds")
        .sort(sort)
        .skip(skip)
        .limit(limit),

      RoleModel.countDocuments(filter)
    ]);

    return res.json({
      page,
      total,
      roles
    });

  } catch {
    return res.status(500).json({
      error: "server_error"
    });
  }
};




export const updateRoleController = async (req, res) => {

  const { roleId } = req.params;

  const {
    name,
    permissionIds,
    status
  } = req.body;

  const actorUserId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const role = await RoleModel.findById(roleId);

    if (!role || role.deletedAt) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    if (permissionIds) {

      const permissions = await PermissionModel.find({
        _id: { $in: permissionIds },
        appId: role.appId,
        status: "ACTIVE",
        deletedAt: null
      });

      if (permissions.length !== permissionIds.length) {
        return res.status(400).json({
          error: "invalid_permissions"
        });
      }
    }

    const before = {
      name: role.name,
      permissionIds: role.permissionIds,
      status: role.status
    };

    if (name) role.name = name;
    if (permissionIds) role.permissionIds = permissionIds;
    if (status) role.status = status;

    await role.save();

    const after = {
      name: role.name,
      permissionIds: role.permissionIds,
      status: role.status
    };

    eventBus.emit("role.updated", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Role updated",

      metadata: {
        actorUserId,
        roleId,
        action: "UPDATE_ROLE",

        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "Role updated"
    });

  } catch (error) {

    eventBus.emit("role.update.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        roleId,
        action: "UPDATE_ROLE"
      }
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};




export const deleteRoleController = async (req, res) => {

  const { roleId } = req.params;

  const actorUserId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const role = await RoleModel.findById(roleId);

    if (!role || role.deletedAt) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    const before = {
      status: role.status,
      deletedAt: role.deletedAt
    };

    role.status = "DISABLED";
    role.deletedAt = new Date();

    await role.save();

    const after = {
      status: role.status,
      deletedAt: role.deletedAt
    };

    eventBus.emit("role.deleted", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Role soft deleted",

      metadata: {
        actorUserId,
        roleId,
        action: "DELETE_ROLE",

        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "Role deleted"
    });

  } catch (error) {

    eventBus.emit("role.delete.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        roleId,
        action: "DELETE_ROLE"
      }
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};




export const recoverRoleController = async (req, res) => {

  const { roleId } = req.params;

  const actorUserId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const role = await RoleModel.findById(roleId);

    if (!role || !role.deletedAt) {
      return res.status(404).json({
        error: "role_not_found_or_not_deleted"
      });
    }

    const before = {
      status: role.status,
      deletedAt: role.deletedAt
    };

    role.status = "ACTIVE";
    role.deletedAt = null;

    await role.save();

    const after = {
      status: role.status,
      deletedAt: role.deletedAt
    };

    eventBus.emit("role.recovered", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Role recovered",

      metadata: {
        actorUserId,
        roleId,
        action: "RECOVER_ROLE",

        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "Role recovered"
    });

  } catch (error) {

    eventBus.emit("role.recover.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        roleId,
        action: "RECOVER_ROLE"
      }
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};




export const hardDeleteRoleController = async (req, res) => {

  const { roleId } = req.params;

  const actorUserId = req.session.userId;

  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const role = await RoleModel.findById(roleId);

    if (!role) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    await UserAppAccessModel.updateMany(
      { roleIds: roleId },
      {
        $pull: {
          roleIds: roleId
        }
      }
    );

    await UserAppAccessModel.updateMany(
      {
        roleIds: { $size: 0 },
        status: "ACTIVE"
      },
      {
        status: "REVOKED"
      }
    );

    await RoleModel.deleteOne({
      _id: roleId
    });

    eventBus.emit("role.deleted.permanent", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Role permanently deleted",

      metadata: {
        actorUserId,
        roleId,
        action: "PERMANENT_DELETE_ROLE"
      }
    });

    return res.json({
      message: "Role permanently deleted"
    });

  } catch (error) {

    eventBus.emit("role.delete.permanent.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        roleId,
        action: "PERMANENT_DELETE_ROLE"
      }
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};













export const removeRoleFromUserController = async (req, res) => {
  const { userId, appId, roleId } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const access = await UserAppAccessModel.findOne({
      userId,
      appId,
      status: "ACTIVE"
    });

    if (!access) {
      return res.status(404).json({
        error: "user_access_not_found"
      });
    }

    const hasRole = access.roleIds.some(
      r => r.toString() === roleId
    );

    if (!hasRole) {
      return res.status(400).json({
        error: "role_not_assigned"
      });
    }

    const before = {
      roleIds: [...access.roleIds]
    };

    access.roleIds = access.roleIds.filter(
      r => r.toString() !== roleId
    );

    // 🔥 No roles left => revoke access
    if (access.roleIds.length === 0) {
      access.status = "REVOKED";
    }

    await access.save();

    const after = {
      roleIds: access.roleIds,
      status: access.status
    };

    eventBus.emit("role.user.removed", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Role removed from user",
      metadata: {
        actorUserId,
        targetUserId: userId,
        appId,
        roleId,
        action: "REMOVE_ROLE_FROM_USER",
        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "Role removed from user"
    });

  } catch (error) {

    eventBus.emit("role.user.remove.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,
      metadata: {
        targetUserId: userId,
        roleId,
        appId
      }
    });

    return res.status(500).json({
      error: "server_error"
    });
  }
};





export const listUsersAssignedToRoleController = async (req, res) => {
  const { roleId } = req.params;

  try {

    const users = await UserAppAccessModel.find({
      roleIds: roleId,
      status: "ACTIVE"
    })
      .populate("userId", "email status")
      .populate("appId", "name");

    return res.json({
      total: users.length,
      users
    });

  } catch {
    return res.status(500).json({
      error: "server_error"
    });
  }
};





export const listRolesForAppController = async (req, res) => {
  const { appId } = req.params;

  try {

    const roles = await RoleModel.find({
      appId,
      deletedAt: null
    }).populate("permissionIds");

    return res.json({
      total: roles.length,
      roles
    });

  } catch {
    return res.status(500).json({
      error: "server_error"
    });
  }
};





export const addPermissionsToRoleController = async (req, res) => {
  const { roleId } = req.params;
  const { permissionIds = [] } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const role = await RoleModel.findById(roleId);

    if (!role || role.deletedAt) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    const before = {
      permissionIds: [...role.permissionIds]
    };

    const existingIds = role.permissionIds.map(
      p => p.toString()
    );

    const newIds = permissionIds.filter(
      p => !existingIds.includes(p)
    );

    role.permissionIds.push(...newIds);

    await role.save();

    const after = {
      permissionIds: role.permissionIds
    };

    eventBus.emit("role.permissions.added", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Permissions added to role",
      metadata: {
        actorUserId,
        roleId,
        addedPermissions: newIds,
        action: "ADD_PERMISSIONS_TO_ROLE",
        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "Permissions added"
    });

  } catch (error) {

    eventBus.emit("role.permissions.add.error", {
      userId: actorUserId,
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





export const removePermissionsFromRoleController = async (req, res) => {
  const { roleId } = req.params;
  const { permissionIds = [] } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const role = await RoleModel.findById(roleId);

    if (!role || role.deletedAt) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    const before = {
      permissionIds: [...role.permissionIds]
    };

    role.permissionIds = role.permissionIds.filter(
      p => !permissionIds.includes(p.toString())
    );

    await role.save();

    const after = {
      permissionIds: role.permissionIds
    };

    eventBus.emit("role.permissions.removed", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Permissions removed from role",
      metadata: {
        actorUserId,
        roleId,
        removedPermissions: permissionIds,
        action: "REMOVE_PERMISSIONS_FROM_ROLE",
        changes: {
          before,
          after
        }
      }
    });

    return res.json({
      message: "Permissions removed"
    });

  } catch (error) {

    eventBus.emit("role.permissions.remove.error", {
      userId: actorUserId,
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





export const listPermissionsOfRoleController = async (req, res) => {
  const { roleId } = req.params;

  try {

    const role = await RoleModel.findOne({
      _id: roleId,
      deletedAt: null
    }).populate({
      path: "permissionIds",
      match: {
        deletedAt: null,
        status: "ACTIVE"
      }
    });

    if (!role) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    return res.json({
      total: role.permissionIds.length,
      permissions: role.permissionIds
    });

  } catch {
    return res.status(500).json({
      error: "server_error"
    });
  }
};





export const resolveEffectivePermissionsController = async (req, res) => {
  const { userId, appId } = req.query;

  try {

    const access = await UserAppAccessModel.findOne({
      userId,
      appId,
      status: "ACTIVE"
    }).populate({
      path: "roleIds",
      match: {
        deletedAt: null,
        status: "ACTIVE"
      }
    });

    if (!access) {
      return res.status(404).json({
        error: "access_not_found"
      });
    }

    const permissionIds = access.roleIds.flatMap(
      role => role.permissionIds
    );

    const permissions = await PermissionModel.find({
      _id: { $in: permissionIds },
      status: "ACTIVE",
      deletedAt: null
    });

    const uniquePermissions = [
      ...new Set(permissions.map(p => p.key))
    ];

    return res.json({
      permissions: uniquePermissions
    });

  } catch {
    return res.status(500).json({
      error: "server_error"
    });
  }
};




export const cloneRoleController = async (req, res) => {
  const { roleId } = req.params;
  const { newName } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {

    const role = await RoleModel.findOne({
      _id: roleId,
      deletedAt: null
    });

    if (!role) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    const clonedRole = await RoleModel.create({
      appId: role.appId,
      name: newName,
      permissionIds: role.permissionIds,
      status: "ACTIVE"
    });

    eventBus.emit("role.cloned", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Role cloned",
      metadata: {
        actorUserId,
        sourceRoleId: roleId,
        clonedRoleId: clonedRole._id,
        action: "CLONE_ROLE"
      }
    });

    return res.status(201).json({
      message: "Role cloned",
      role: clonedRole
    });

  } catch (error) {

    if (error.code === 11000) {
      return res.status(400).json({
        error: "role_already_exists"
      });
    }

    eventBus.emit("role.clone.error", {
      userId: actorUserId,
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





export const roleUsageAnalyticsController = async (req, res) => {
  const { roleId } = req.params;

  try {

    const role = await RoleModel.findById(roleId);

    if (!role) {
      return res.status(404).json({
        error: "role_not_found"
      });
    }

    const assignedUsers = await UserAppAccessModel.countDocuments({
      roleIds: roleId,
      status: "ACTIVE"
    });

    const permissionsCount = role.permissionIds.length;

    return res.json({
      roleId,
      roleName: role.name,
      assignedUsers,
      permissionsCount,
      createdAt: role.createdAt
    });

  } catch {
    return res.status(500).json({
      error: "server_error"
    });
  }
};