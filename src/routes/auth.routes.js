



import express from "express";

import { confirmPasswordResetController, getMyApps, login, requestPasswordResetController, selectApp } from "../controllers/auth.controller.js";
import { confirmAccountRecoveryController, requestAccountRecoveryController } from "../controllers/accountRecovery.controller.js";
const authRoute=express.Router();
authRoute.post("/login", login);
authRoute.post("/select-app", selectApp);
authRoute.get("/my-apps", getMyApps);

authRoute.post("/recovery/request", requestAccountRecoveryController);
authRoute.post("/recovery/confirm", confirmAccountRecoveryController);

authRoute.post("/password/reset/request", requestPasswordResetController);
authRoute.post("/password/reset/confirm", confirmPasswordResetController);



export default authRoute