
// routes/permission.routes.js
import express from "express";
import {
  createPermissionController,
  listPermissionsController,
  getPermissionController,
  updatePermissionController,
  deletePermissionController,
  recoverPermissionController,
  hardDeletePermissionController
} from "../controllers/permission.controller.js";

import { requireSessionAuth } from "../middleware/requireSessionAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const permissionRoute = express.Router();

permissionRoute.use(requireSessionAuth, requireAdmin);

permissionRoute.post("/", createPermissionController);
permissionRoute.get("/", listPermissionsController);
permissionRoute.get("/:permissionId", getPermissionController);
permissionRoute.patch("/:permissionId", updatePermissionController);
permissionRoute.delete("/:permissionId", deletePermissionController);
permissionRoute.patch(
  "/:permissionId/recover",
  recoverPermissionController
);

permissionRoute.delete(
  "/:permissionId/permanent",
  hardDeletePermissionController
);
export default permissionRoute;