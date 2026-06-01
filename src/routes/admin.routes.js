
// routes/admin.routes.js
import express from "express";
import { requireSessionAuth } from "../middleware/requireSessionAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { deleteUserController, demoteAdminController, getUserController, listUsersController, promoteToAdminController, updateUserController } from "../controllers/admin.controller.js";
import { assignUserToAppController, removeUserFromAppController } from "../controllers/userAppAccess.controller.js";

const adminRoutes=express.Router();




adminRoutes.use(requireSessionAuth);
adminRoutes.use(requireAdmin);

adminRoutes.delete("/users/remove-app-role", removeUserFromAppController);
adminRoutes.post("/users/assign-app-role", assignUserToAppController);

adminRoutes.patch("/users/:userId/promote", promoteToAdminController);
adminRoutes.patch("/users/:userId/demote", demoteAdminController);

adminRoutes.get("/users", listUsersController);
adminRoutes.get("/users/:userId", getUserController);

adminRoutes.patch("/users/:userId", updateUserController);
adminRoutes.delete("/users/:userId", deleteUserController);


export default adminRoutes



