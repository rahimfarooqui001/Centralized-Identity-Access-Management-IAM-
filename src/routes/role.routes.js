import express from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireSessionAuth } from "../middleware/requireSessionAuth.js";
import {
  addPermissionsToRoleController,
  cloneRoleController,
  createRoleController,
  deleteRoleController,
  getRoleController,
  hardDeleteRoleController,
  listPermissionsOfRoleController,
  listRolesController,
  listRolesForAppController,
  listUsersAssignedToRoleController,
  recoverRoleController,
  removePermissionsFromRoleController,
  removeRoleFromUserController,
  resolveEffectivePermissionsController,
  roleUsageAnalyticsController,
  updateRoleController,
} from "../controllers/role.controller.js";

const roleRoutes = express.Router();
roleRoutes.post("/", requireSessionAuth, requireAdmin, createRoleController);

roleRoutes.get("/", requireSessionAuth, requireAdmin, listRolesController);

roleRoutes.get("/:roleId", requireSessionAuth, requireAdmin, getRoleController);

roleRoutes.patch(
  "/:roleId",
  requireSessionAuth,
  requireAdmin,
  updateRoleController,
);

roleRoutes.delete(
  "/:roleId",
  requireSessionAuth,
  requireAdmin,
  deleteRoleController,
);

roleRoutes.patch(
  "/:roleId/recover",
  requireSessionAuth,
  requireAdmin,
  recoverRoleController,
);

roleRoutes.delete(
  "/:roleId/permanent",
  requireSessionAuth,
  requireAdmin,
  hardDeleteRoleController,
);



roleRoutes.delete(
  "/remove-role-from-user",
  requireSessionAuth,
  requireAdmin,
  removeRoleFromUserController,
);

roleRoutes.get(
  "/:roleId/users",
  requireSessionAuth,
  requireAdmin,
  listUsersAssignedToRoleController,
);

roleRoutes.get(
  "/app/:appId",
  requireSessionAuth,
  requireAdmin,
  listRolesForAppController,
);

roleRoutes.post(
  "/:roleId/permissions",
  requireSessionAuth,
  requireAdmin,
  addPermissionsToRoleController,
);

roleRoutes.delete(
  "/:roleId/permissions",
  requireSessionAuth,
  requireAdmin,
  removePermissionsFromRoleController,
);

roleRoutes.get(
  "/:roleId/permissions",
  requireSessionAuth,
  requireAdmin,
  listPermissionsOfRoleController,
);

roleRoutes.get(
  "/effective-permissions",
  requireSessionAuth,
  requireAdmin,
  resolveEffectivePermissionsController,
);

roleRoutes.post(
  "/:roleId/clone",
  requireSessionAuth,
  requireAdmin,
  cloneRoleController,
);

roleRoutes.get(
  "/:roleId/analytics",
  requireSessionAuth,
  requireAdmin,
  roleUsageAnalyticsController,
);

export default roleRoutes;
