



import express from "express";
import { requireSessionAuth } from "../middleware/requireSessionAuth.js";
import { deleteMeController, getMeController, listSessionsController, logoutAllController, logoutController, registerUserController, revokeOtherSessionsController, revokeSessionController, updateMeController } from "../controllers/user.controller.js";


const userRoutes=express.Router();
userRoutes.post("/register",registerUserController);




userRoutes.get("/me", requireSessionAuth, getMeController);
userRoutes.patch("/me", requireSessionAuth, updateMeController);
userRoutes.delete("/me", requireSessionAuth, deleteMeController);
userRoutes.get("/sessions", requireSessionAuth, listSessionsController);

userRoutes.delete("/sessions/current", requireSessionAuth, logoutController);

userRoutes.delete("/sessions/others", requireSessionAuth, revokeOtherSessionsController);

userRoutes.delete("/sessions/all", requireSessionAuth, logoutAllController);
userRoutes.delete("/sessions/:sessionId", requireSessionAuth, revokeSessionController);




export default userRoutes
