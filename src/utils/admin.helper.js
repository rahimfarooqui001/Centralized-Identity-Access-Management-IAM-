import UserModel from "../models/user.model.js";
import UserSystemRoleModel from "../models/userSystemRole.model.js";
import { AppError } from "./errors.js";
import { getSystemRoleIds } from "./systemRole.helper.js";

//  Count ONLY ACTIVE admins
export const countAdmins = async () => {
  const roles = await getSystemRoleIds();

  const activeUserIds = await UserModel.find({ status: "ACTIVE" }).distinct("_id");

  return UserSystemRoleModel.countDocuments({
    roleId: roles.ADMIN,
    userId: { $in: activeUserIds }
  });
};


//  Check ACTIVE admin only
export const isUserAdmin = async (userId) => {
  const roles = await getSystemRoleIds();

  const user = await UserModel.findById(userId).select("status");

  if (!user || user.status !== "ACTIVE") return false;

  const role = await UserSystemRoleModel.findOne({
    userId,
    roleId: roles.ADMIN
  });

  return !!role;
};


//  Last admin protection (ACTIVE only)
export const ensureNotLastAdmin = async (userId) => {
  const roles = await getSystemRoleIds();

  const isAdmin = await isUserAdmin(userId);
  if (!isAdmin) return;

  const adminCount = await countAdmins();

  if (adminCount <= 1) {
    throw new AppError(
      "Cannot modify the last active admin",
      400,
      "last_admin_protection"
    );
  }
};


export const hasAdminRole = async (userId) => {
  const roles = await getSystemRoleIds();

  const role = await UserSystemRoleModel.findOne({
    userId,
    roleId: roles.ADMIN
  });

  return !!role;
};