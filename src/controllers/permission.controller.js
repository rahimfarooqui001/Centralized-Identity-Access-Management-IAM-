import PermissionModel from "../models/permission.model.js";
import RoleModel from "../models/role.model.js";
import eventBus from "../events/eventBus.js";
import { AppError } from "../utils/errors.js";
import { buildQuery, buildPagination, buildSort } from "../utils/query.util.js";


export const createPermissionController = async (req, res) => {
  const { appId, key, description } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const permission = await PermissionModel.create({
      appId,
      key,
      description
    });

    eventBus.emit("permission.created", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Permission created",
      metadata: {
        actorUserId,
        permissionId: permission._id,
        action: "CREATE_PERMISSION"
      }
    });

    return res.status(201).json({
      message: "Permission created",
      permission
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "permission_already_exists" });
    }

    eventBus.emit("permission.create.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};




export const getPermissionController = async (req, res) => {
  const { permissionId } = req.params;

  const permission = await PermissionModel.findOne({
    _id: permissionId,
    deletedAt: null
  });

  if (!permission) {
    return res.status(404).json({ error: "permission_not_found" });
  }

  return res.json({ permission });
};




export const listPermissionsController = async (req, res) => {
  const filter = buildQuery(req.query, ["key", "status","createdAt"]);
  const { skip, limit, page } = buildPagination(req.query);
  const sort = buildSort(req.query, ["createdAt", "key"]);

  filter.deletedAt = null;

  const [permissions, total] = await Promise.all([
    PermissionModel.find(filter).sort(sort).skip(skip).limit(limit),
    PermissionModel.countDocuments(filter)
  ]);

  return res.json({
    page,
    total,
    permissions
  });
};




export const updatePermissionController = async (req, res) => {
  const { permissionId } = req.params;
  const { key, description, status } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const permission = await PermissionModel.findById(permissionId);

    if (!permission || permission.deletedAt) {
      return res.status(404).json({ error: "permission_not_found" });
    }

    const before = {
      key: permission.key,
      description: permission.description,
      status: permission.status
    };

    if (key) permission.key = key;
    if (description) permission.description = description;
    if (status) permission.status = status;

    await permission.save();

    const after = {
      key: permission.key,
      description: permission.description,
      status: permission.status
    };

    eventBus.emit("permission.updated", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Permission updated",
      metadata: {
        actorUserId,
        permissionId,
        action: "UPDATE_PERMISSION",
        changes: { before, after }
      }
    });

    return res.json({ message: "Permission updated" });

  } catch (error) {
    eventBus.emit("permission.update.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};




export const deletePermissionController = async (req, res) => {
  const { permissionId } = req.params;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const permission = await PermissionModel.findById(permissionId);

    if (!permission || permission.deletedAt) {
      return res.status(404).json({ error: "permission_not_found" });
    }

    const before = {
      status: permission.status,
      deletedAt: permission.deletedAt
    };

    permission.deletedAt = new Date();
    permission.status = "DISABLED";

    await permission.save();

    

    const after = {
      status: permission.status,
      deletedAt: permission.deletedAt
    };

    eventBus.emit("permission.deleted", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Permission deleted",
      metadata: {
        actorUserId,
        permissionId,
        action: "DELETE_PERMISSION",
        changes: { before, after }
      }
    });

    return res.json({ message: "Permission deleted" });

  } catch (error) {
    eventBus.emit("permission.delete.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};


export const recoverPermissionController = async (req, res) => {
  const { permissionId } = req.params;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const permission = await PermissionModel.findById(permissionId);

    if (!permission || !permission.deletedAt) {
      return res.status(404).json({
        error: "permission_not_found_or_not_deleted"
      });
    }

    const before = {
      status: permission.status,
      deletedAt: permission.deletedAt
    };

    permission.deletedAt = null;
    permission.status = "ACTIVE";

    await permission.save();

    const after = {
      status: permission.status,
      deletedAt: permission.deletedAt
    };

    eventBus.emit("permission.recovered", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Permission recovered",
      metadata: {
        actorUserId,
        permissionId,
        action: "RECOVER_PERMISSION",
        changes: { before, after }
      }
    });

    return res.json({ message: "Permission recovered" });

  } catch (error) {
    eventBus.emit("permission.recover.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};


export const hardDeletePermissionController = async (req, res) => {
  const { permissionId } = req.params;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const permission = await PermissionModel.findById(permissionId);

    if (!permission) {
      return res.status(404).json({ error: "permission_not_found" });
    }

    const before = {
      permissionId,
      key: permission.key
    };

    await RoleModel.updateMany(
      { permissionIds: permissionId },
      { $pull: { permissionIds: permissionId } }
    );

    await PermissionModel.deleteOne({ _id: permissionId });

    eventBus.emit("permission.deleted.permanent", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "success",
      message: "Permission permanently deleted",
      metadata: {
        actorUserId,
        permissionId,
        action: "PERMANENT_DELETE_PERMISSION",
        before
      }
    });

    return res.json({ message: "Permission permanently deleted" });

  } catch (error) {
    eventBus.emit("permission.delete.permanent.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};