import mongoose from "mongoose";


const userAppAccessSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true
    },
    roleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
      }
    ],
    status: {
      type: String,
      enum: ["ACTIVE", "REVOKED"],
      default: "ACTIVE"
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: false }
);

userAppAccessSchema.index({ userId: 1, appId: 1 }, { unique: true });
const UserAppAccessModel=mongoose.model("UserAppAccess", userAppAccessSchema);
export default  UserAppAccessModel;


