import express from "express";
import cors from "cors";
import applicationRoutes from "./src/routes/application.routes.js";
import authRoute from "./src/routes/auth.routes.js";
import permissionRoute from "./src/routes/permission.routes.js";
import roleRoutes from "./src/routes/role.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import errorMiddleware from "./src/middleware/middleware.error.js";
import session from "express-session";
import env from "./src/config/env.js";
import oauthRoutes from "./src/routes/oauth.routes.js";
import cookieParser from "cookie-parser";
import './src/events/audit.listener.js'
import adminRoutes from "./src/routes/admin.routes.js";
import { sessionMiddleware } from "./src/config/session.js";

const app = express();



app.use(cors())
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use('/app',applicationRoutes)
app.use('/auth',authRoute)
app.use('/oauth',oauthRoutes)
app.use('/permissions',permissionRoute)
app.use('/roles',roleRoutes)
app.use('/users',userRoutes)
app.use('/admin',adminRoutes)







// app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use(errorMiddleware);


export default app;