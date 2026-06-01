import SystemRoleModel from "../models/systemRole.model.js";
import UserSystemRoleModel from "../models/userSystemRole.model.js";

export const requireAdmin = async (req, res, next) => {
  const { userId } = req.auth;

  const adminRole = await SystemRoleModel.findOne({ name: "ADMIN" });

  const isAdmin = await UserSystemRoleModel.exists({
    userId,
    roleId: adminRole._id
  });

  if (!isAdmin) {
    return res.status(403).json({
      error: "forbidden",
      message: "Admin access required"
    });
  }

  next();
};