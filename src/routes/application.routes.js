





import express from "express";
import {
  createApplicationController,
  deleteApplicationController,
  deleteApplicationPermanentlyController,
  getApplicationController,
  listApplicationsController,
  listAppUsersController,
  recoverApplicationController,
  rotateClientSecretController,
  updateApplicationController
} from "../controllers/application.controller.js";

import { requireAdmin } from "../middleware/requireAdmin.js";
import { requireSessionAuth } from "../middleware/requireSessionAuth.js";

const applicationRoutes = express.Router();

// Create
applicationRoutes.post(
  "/",
  requireSessionAuth,
  requireAdmin,
  createApplicationController
);

// List
applicationRoutes.get(
  "/",
  requireSessionAuth,
  requireAdmin,
  listApplicationsController
);

// Get single
applicationRoutes.get(
  "/:appId",
  requireSessionAuth,
  requireAdmin,
  getApplicationController
);
// List app users
applicationRoutes.get(
  "/:appId/users",
  requireSessionAuth,
  requireAdmin,
  listAppUsersController
);

// Update
applicationRoutes.patch(
  "/:appId",
  requireSessionAuth,
  requireAdmin,
  updateApplicationController
);

//  Recover
applicationRoutes.patch("/:appId/recover", recoverApplicationController);

// Delete
applicationRoutes.delete(
  "/:appId",
  requireSessionAuth,
  requireAdmin,
  deleteApplicationController
);

// Rotate secret
applicationRoutes.post(
  "/:appId/rotate-secret",
  requireSessionAuth,
  requireAdmin,
  rotateClientSecretController
);

// Permanent delete Application
applicationRoutes.delete("/:appId/permanent", deleteApplicationPermanentlyController);



export default applicationRoutes;