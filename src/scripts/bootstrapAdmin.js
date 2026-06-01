// script/bootstrapAdmin.js
import bcrypt from "bcrypt";
import UserModel from "../models/user.model.js";
import SystemRoleModel from "../models/systemRole.model.js";
import UserSystemRoleModel from "../models/userSystemRole.model.js";
import env from "../config/env.js";
import eventBus from "../events/eventBus.js";

export const bootstrapAdmin = async () => {
  try {
    if (env.bootStrap.bootstrapAdminEnabled !== "true") {
      return;
    }

    const email = env.bootStrap.bootstrapAdminEmail;
    const password = env.bootStrap.bootstrapAdminPassword;

    if (!email || !password) {
      throw new Error("Bootstrap admin credentials missing in env");
    }

    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      const adminRole = await SystemRoleModel.findOne({ name: "ADMIN" });

      const alreadyAdmin = await UserSystemRoleModel.findOne({
        userId: existingUser._id,
        roleId: adminRole._id
      });

      if (alreadyAdmin) {
        return; 
      }

      await UserSystemRoleModel.create({
        userId: existingUser._id,
        roleId: adminRole._id
      });

      eventBus.emit("system.admin.bootstrap.assigned", {
        userId: existingUser._id,
        email,
        message: "Existing user promoted to ADMIN via bootstrap",
        status: "success"
      });

      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await UserModel.create({
      name:"Mohammed Rahim uddin Farooqui",
      email,
      passwordHash,
      status: "ACTIVE"
    });

    const adminRole = await SystemRoleModel.findOne({ name: "ADMIN" });

    if (!adminRole) {
      throw new Error("ADMIN role not found. Run seed first.");
    }

    await UserSystemRoleModel.create({
      userId: user._id,
      roleId: adminRole._id
    });

    eventBus.emit("system.admin.bootstrap.created", {
      userId: user._id,
      email,
      message: "Bootstrap admin created",
      status: "success"
    });

  } catch (error) {
    eventBus.emit("system.admin.bootstrap.error", {
      message: "Bootstrap admin failed",
      status: "failure",
      reason: error.message,
      metadata: {
        stack: error.stack
      }
    });

    throw error; 
  }
};