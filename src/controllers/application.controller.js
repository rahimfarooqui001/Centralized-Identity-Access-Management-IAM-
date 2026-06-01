


import eventBus from "../events/eventBus.js";
import ApplicationModel from "../models/application.model.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";

import bcrypt from "bcrypt";
import crypto from "crypto";
import { buildPagination, buildQuery, buildSort } from "../utils/query.util.js";
import UserModel from "../models/user.model.js";
import PermissionModel from "../models/permission.model.js";
import RoleModel from "../models/role.model.js";



const SALT_ROUNDS = 12;


export const createApplicationController = async (req, res) => {
  const { name, appKey, redirectUris = [], defaultRedirectUri } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    if (!name || !appKey || !defaultRedirectUri) {
      return res.status(400).json({
        error: "invalid_request",
        message: "name, appKey and defaultRedirectUri are required"
      });
    }

   

    const exists = await ApplicationModel.findOne({ appKey });
    if (exists) {
      return res.status(409).json({ error: "app_key_exists" });
    }

    const clientId = crypto.randomUUID();
    const rawSecret = "app_" + crypto.randomBytes(32).toString("hex");
    const hashedSecret = await bcrypt.hash(rawSecret, SALT_ROUNDS);

    const app = await ApplicationModel.create({
      name,
      appKey,
      clientId,
      clientSecretHash: hashedSecret,
      redirectUris,
      defaultRedirectUri,
      ownerId: actorUserId
    });

    eventBus.emit("app.created", {
      userId: actorUserId,
      appId: app._id,
      ip,
      userAgent,
      status: "success",
      message: "Application created"
    });

    return res.status(201).json({
      message: "Application created",
      clientId,
      clientSecret: rawSecret
    });

  } catch (error) {
    eventBus.emit("app.create.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};




export const listApplicationsController = async (req, res) => {
  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const { page, limit, skip } = buildPagination(req.query);

    const allowedFields = ["name", "appKey", "status", "createdAt"];

    const dynamicFilter = buildQuery(req.query, allowedFields);
    const sort = buildSort(req.query, allowedFields);

    const finalFilter = {
      deletedAt: null,
      ...dynamicFilter
    };

    const [apps, total] = await Promise.all([
      ApplicationModel.find(finalFilter)
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),

      ApplicationModel.countDocuments(finalFilter)
    ]);

   

    return res.json({
      data: apps,
      pagination: {
        total,
        page,
        limit
      }
    });

  } catch (error) {
  

    return res.status(500).json({
      error: "server_error"
    });
  }
};


export const getApplicationController = async (req, res) => {
  const actorUserId = req.session.userId;

  try {
    const app = await ApplicationModel.findOne({
      _id: req.params.appId,
      deletedAt: null
    });

    if (!app) {
      return res.status(404).json({ error: "app_not_found" });
    }

   
    return res.json(app);

  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
};


export const updateApplicationController = async (req, res) => {
  const { name, redirectUris, status } = req.body;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const app = await ApplicationModel.findById(req.params.appId);

    if (!app || app.deletedAt) {
      return res.status(404).json({ error: "app_not_found" });
    }

    if (status && !["ACTIVE", "DISABLED"].includes(status)) {
      return res.status(400).json({ error: "invalid_status" });
    }

    if (name) app.name = name;
    if (redirectUris) app.redirectUris = redirectUris;
    if (status) app.status = status;

    await app.save();

    eventBus.emit("app.updated", {
      userId: actorUserId,
      appId: app._id,
      ip,
      userAgent,
      status: "success",
      message: "Application updated"
    });

    return res.json({ message: "Application updated" });

  } catch (error) {
    eventBus.emit("app.update.error", {
      userId: actorUserId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};





export const deleteApplicationController = async (req, res) => {
  const appId = req.params.appId;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const app = await ApplicationModel.findById(appId);

    if (!app || app.deletedAt) {
      return res.status(404).json({ error: "app_not_found" });
    }

    const totalUsers = await UserAppAccessModel.countDocuments({
      appId,
      status: "ACTIVE"
    });

    if (totalUsers > 0) {
      const usersPreview = await UserAppAccessModel.find({ appId })
        .populate("userId", "email")
        .limit(5);

      return res.status(400).json({
        error: "app_in_use",
        message: "Users are still assigned to this application",
        totalUsers,
        users: usersPreview.map(u => ({
          id: u.userId._id,
          email: u.userId.email
        }))
      });
    }

    const before = {
      status: app.status,
      deletedAt: app.deletedAt
    };

    app.status = "DISABLED";
    app.deletedAt = new Date();
    await app.save();

    await RoleModel.updateMany(
      { appId },
      {
        status: "DISABLED",
        deletedAt: new Date()
      }
    );

    await PermissionModel.updateMany(
      { appId },
      {
        status: "DISABLED",
        deletedAt: new Date()
      }
    );

    const after = {
      status: app.status,
      deletedAt: app.deletedAt
    };

    eventBus.emit("app.deleted", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "success",
      message: "Application soft deleted",

      metadata: {
        actorUserId,
        targetAppId: appId,
        action: "SOFT_DELETE_APP",
        reason: "manual_admin_delete",

        changes: {
          before,
          after
        }
      }
    });

    return res.json({ message: "Application soft deleted" });

  } catch (error) {
    console.error("SOFT DELETE APP ERROR:", error);

    eventBus.emit("app.delete.error", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message,

      metadata: {
        actorUserId,
        targetAppId: appId,
        action: "SOFT_DELETE_APP"
      }
    });

    return res.status(500).json({ error: "server_error" });
  }
};

export const rotateClientSecretController = async (req, res) => {
  const appId = req.params.appId;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const app = await ApplicationModel.findById(appId);

    if (!app || app.status !== "ACTIVE") {
      return res.status(404).json({ error: "application_not_found" });
    }

    const rawSecret = "app_" + crypto.randomBytes(32).toString("hex");
    const hashedSecret = await bcrypt.hash(rawSecret, SALT_ROUNDS);

    app.clientSecretHash = hashedSecret;
    await app.save();

    eventBus.emit("app.client_secret.rotated", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "success",
      message: "Client secret rotated"
    });

    return res.json({
      clientId: app.clientId,
      clientSecret: rawSecret
    });

  } catch (error) {
    eventBus.emit("app.client_secret.rotate.error", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};





export const listAppUsersController = async (req, res) => {
  const  appId  = req.params.appId;
  console.log(appId,'from list app use controller')

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const { page, limit, skip } = buildPagination(req.query);
    console.log(page,limit,skip, 'from list app use controller')

    const allowedFields = ["email", "status", "createdAt"];

    const dynamicFilter = buildQuery(req.query, allowedFields);
    console.log(dynamicFilter , 'from list app use controller filter ')

    const sort = buildSort(req.query, allowedFields);
    console.log(sort , 'from list app use controller sort ')

    const accessDocs = await UserAppAccessModel.find({ appId })
      .select("userId")
      .lean();

      console.log(accessDocs,'acess docsss')
    const userIds = accessDocs.map(d => d.userId);

    const finalFilter = {
      _id: { $in: userIds },
      ...dynamicFilter
    };

    const [users, total] = await Promise.all([
      UserModel.find(finalFilter)
        .select("email status createdAt")
        .skip(skip)
        .limit(limit)
        .sort(sort)
        .lean(),

      UserModel.countDocuments(finalFilter)
    ]);

 

    return res.json({
      data: users,
      pagination: {
        total,
        page,
        limit
      }
    });

  } catch (error) {
  

    return res.status(500).json({
      error: "server_error"
    });
  }
};



export const deleteApplicationPermanentlyController = async (req, res) => {
  const { appId } = req.params;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const app = await ApplicationModel.findById(appId);

    if (!app) {
      return res.status(404).json({ error: "app_not_found" });
    }

    const activeUsers = await UserAppAccessModel.countDocuments({
      appId,
      status: "ACTIVE"
    });

    if (activeUsers > 0) {
      return res.status(400).json({
        error: "app_in_use",
        message: "Cannot permanently delete app with active users"
      });
    }

    const before = {
      app,
      rolesCount: await RoleModel.countDocuments({ appId }),
      permissionsCount: await PermissionModel.countDocuments({ appId })
    };

    await Promise.all([
      ApplicationModel.deleteOne({ _id: appId }),
      RoleModel.deleteMany({ appId }),
      PermissionModel.deleteMany({ appId }),
      UserAppAccessModel.deleteMany({ appId })
    ]);

    eventBus.emit("app.deleted.permanent", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "success",
      message: "Application permanently deleted",
      metadata: {
        actorUserId,
        targetAppId: appId,
        action: "PERMANENT_DELETE_APPLICATION",
        before
      }
    });

    return res.json({ message: "Application permanently deleted" });

  } catch (error) {

    if (error.code) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("app.delete.permanent.error", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};






export const recoverApplicationController = async (req, res) => {
  const { appId } = req.params;

  const actorUserId = req.session.userId;
  const ip = req.ip;
  const userAgent = req.headers["user-agent"];

  try {
    const app = await ApplicationModel.findById(appId);

    if (!app || !app.deletedAt) {
      return res.status(404).json({ error: "app_not_found_or_not_deleted" });
    }

    const before = {
      status: app.status,
      deletedAt: app.deletedAt
    };

    app.deletedAt = null;
    app.status = "ACTIVE";
    await app.save();

    await RoleModel.updateMany(
      { appId },
      { status: "ACTIVE", deletedAt: null }
    );

    await PermissionModel.updateMany(
      { appId },
      { status: "ACTIVE", deletedAt: null }
    );

    const after = {
      status: app.status,
      deletedAt: app.deletedAt
    };

    eventBus.emit("app.recovered", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "success",
      message: "Application recovered",
      metadata: {
        actorUserId,
        targetAppId: appId,
        action: "RECOVER_APPLICATION",
        changes: { before, after }
      }
    });

    return res.json({ message: "Application recovered" });

  } catch (error) {

    if (error.code) {
      return res.status(error.statusCode).json({
        error: error.code,
        message: error.message
      });
    }

    eventBus.emit("app.recover.error", {
      userId: actorUserId,
      appId,
      ip,
      userAgent,
      status: "failure",
      reason: error.message
    });

    return res.status(500).json({ error: "server_error" });
  }
};