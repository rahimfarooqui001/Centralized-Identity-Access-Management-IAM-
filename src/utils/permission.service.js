// services/permission.service.js

import PermissionModel from "../models/permission.model.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";
import { AppError } from "./errors.js";


export const resolveUserAppPermissions = async ({ userId, appId }) => {
  const access = await UserAppAccessModel.findOne({
    userId,
    appId,
    status: "ACTIVE",
  }).populate({
    path:  "roleIds",
    match: { status: "ACTIVE" },
  });

  if (!access) {
    throw new AppError(
      "User does not have access to this application.",
      403,
      "ACCESS_DENIED"
    );
  }

  const permissionIds = access.roleIds.flatMap((role) => role.permissionIds);

  if (!permissionIds.length) {
    return [];
  }

  const permissions = await PermissionModel.find({
    _id:    { $in: permissionIds },
    status: "ACTIVE",
  }).lean(); // .lean() — we only need plain objects for key extraction

  return permissions.map((p) => p.key);
};