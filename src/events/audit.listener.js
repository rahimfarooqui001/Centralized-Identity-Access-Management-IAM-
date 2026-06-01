import eventBus from "./eventBus.js";
import logger from "../logger/index.js";
import { auditQueue } from "../queues/audit.queue.js";

const handleEvent = async (event, payload) => {
  try {
    await auditQueue.add(
      "audit-log",
      {
        event,
        ...payload
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        }
      }
    );

  } catch (err) {
    logger.error("audit.queue.failed", {
      message: "Failed to enqueue audit log",
      event,
      error: err.message
    });
  }
};

// 🔥 Events
const EVENTS = [
// System
    "system.admin.bootstrap.assigned",
    "system.admin.bootstrap.created",
    "system.admin.bootstrap.error",
    // login
  "auth.login.success",
  "auth.login.failed",
//   application 
"app.created",
"app.create.error",
"app.updated",
"app.update.error",
"app.deleted",
"app.delete.error",
"app.client_secret.rotated",
"app.client_secret.rotate.error",
"app.deleted.permanent",
"app.delete.permanent.error",
"app.recovered",
"app.recover.error",
// Permissions

"permission.created",
"permission.create.error",
"permission.updated",
"permission.update.error",
"permission.deleted",
"permission.delete.error",
"permission.recovered", 
"permission.recover.error", 
"permission.deleted.permanent", 
"permission.delete.permanent.error", 

//   logout
  "auth.logout.success",
  "auth.logout.failed",
//   token
  "auth.token.issued",
  "auth.token.refresh.success",
  "auth.token.refresh.failed",
  "auth.token.reuse_detected",
  "auth.access.denied",

  "auth.token.revoked",
"auth.token.revoke_all",
"auth.token.revoke.error",
//   session

  "session.created",
  "session.viewed",
  "session.revoked",
  "session.revoked_failed",
  "session.revoked_all",
  "session.revoked_all.failed",
// select app
  "auth.select_app.failed",
  "auth.select_app.success",


  // 
  "user.created", 
  "user.create.error", 
  // user only
  "user.self.updated",
  "user.self.update.error",
    "user.self.deleted",
  "user.self.delete.error",
  // Admin only 
  "user.updated",
  "user.update.error",
  "user.deleted",
  "user.delete.error",
  "user.app.assigned",
  "user.app.assign.error",
  "user.app.removed",
  "user.app.remove.error",
  "admin.user.promoted",
  "admin.user.promote.error",
"admin.user.demoted",
"admin.user.demote.error",

// recovery account
"user.recovery.requested",
"user.recovery.request.error",
"user.recovered", 
"user.recovery.confirm.error", 

// password reset 
"user.password.reset.requested",
"user.password.reset.request.error",
"user.password.reset.completed",
"user.password.reset.confirm.error",
];

EVENTS.forEach((event) => {
  eventBus.on(event, (payload) => handleEvent(event, payload));
});