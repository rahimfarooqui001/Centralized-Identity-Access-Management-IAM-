import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      index: true
    },

    message: String,

   
    email: {
      type: String,
      index: true,
      sparse: true // only indexed when present
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true
    },

    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      index: true
    },

    ip: String,
    userAgent: String,

    status: {
      type: String,
      enum: ["success", "failure", "initiated"],
      index: true
    },

    reason: String,

    metadata: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);


AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ appId: 1, createdAt: -1 });
AuditLogSchema.index({ status: 1, createdAt: -1 });
AuditLogSchema.index({ email: 1, createdAt: -1 });
const AuditLogModel = mongoose.model("AuditLog", AuditLogSchema);


export default AuditLogModel;