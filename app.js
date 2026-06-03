import express from "express";
import cors from "cors";
import applicationRoutes from "./src/routes/application.routes.js";
import authRoute from "./src/routes/auth.routes.js";
import permissionRoute from "./src/routes/permission.routes.js";
import roleRoutes from "./src/routes/role.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import errorMiddleware from "./src/middleware/middleware.error.js";
import env from "./src/config/env.js";
import oauthRoutes from "./src/routes/oauth.routes.js";
import cookieParser from "cookie-parser";
import './src/events/audit.listener.js'
import adminRoutes from "./src/routes/admin.routes.js";
import { sessionMiddleware } from "./src/config/session.js";
import { authLimiter, globalLimiter } from "./src/middleware/rateLimit.js";

const app = express();



// app.use(cors())  allow all origin
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: env.corsOrigin
    ? env.corsOrigin.split(',')
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use("/api", globalLimiter);

app.use(
  "/api/v1/auth/login",
  authLimiter);

// app.use(
//   session({
//     name: "auth.sid",
//     secret: env.sessionSecret,
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       secure: false, // true in production with HTTPS
//       maxAge: 60 * 60 * 1000 // 1 hour
//     }
//   })
// );

app.use(sessionMiddleware);
const V1 = '/api/v1';
app.use(`${V1}/auth`,authRoute)
app.use(`${V1}/oauth`,oauthRoutes)
app.use(`${V1}/app`,applicationRoutes)
app.use(`${V1}/permissions`,permissionRoute)
app.use(`${V1}/roles`,roleRoutes)
app.use(`${V1}/users`,userRoutes)
app.use(`${V1}/admin`,adminRoutes)







// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'IAM Servcie API is running',
    timestamp: new Date().toISOString(),
    environment:env.nodeEnv,
    version: '1.0.0',
  });
});
app.use(errorMiddleware);


export default app;