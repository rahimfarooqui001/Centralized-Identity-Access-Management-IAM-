// routes/oauth.routes.js
import express from "express";
import { listUserSessionsController, refreshTokenController, revokeSessionController, tokenController } from "../controllers/oauth.controller.js";
import { logout, logoutAllSessionsController, revokeTokenController } from "../controllers/auth.controller.js";
import { validateAccessToken } from "../middleware/validateAccessToken.js";

const oauthRoutes = express.Router();

oauthRoutes.post("/token", tokenController);

oauthRoutes.post("/refresh", refreshTokenController);
oauthRoutes.post("/logout",logout);

oauthRoutes.get("/sessions",validateAccessToken,listUserSessionsController)
oauthRoutes.delete("/sessions/:sessionId",validateAccessToken,revokeSessionController)
oauthRoutes.post(
  "/logout-all", validateAccessToken,
  logoutAllSessionsController
);
oauthRoutes.post("/revoke",revokeTokenController)



export default oauthRoutes;
