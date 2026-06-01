// scripts/seedSystemRoles.js

import SystemRoleModel from "../models/systemRole.model.js";
import logger from "../logger/index.js";

const SYSTEM_ROLES = [
  {
    name: "ADMIN",
    description: "Full access to IAM system"
  },
  {
    name: "USER",
    description: "Default user role"
  }
];

export const seedSystemRoles = async () => {
  try {
    for (const role of SYSTEM_ROLES) {
      const existing = await SystemRoleModel.findOne({ name: role.name });

      if (!existing) {
        await SystemRoleModel.create(role);

        logger.info("system.role.seeded", {
          message: "System role created",
          role: role.name
        });
      }
    }
  } catch (error) {
    logger.error("system.role.seed.failed", {
      message: "Failed to seed system roles",
      error: error.message,
      stack: error.stack
    });

    throw error; 
  }
};