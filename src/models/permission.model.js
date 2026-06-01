import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true
    },
    key: {
      type: String,
      required: true,
      index: true   // e.g. "inventory:create"
    },
    description: {
      type: String
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE"
    },
    deletedAt: {
  type: Date,
  default: null,
  index: true
}
  },
  { timestamps: true }
);

permissionSchema.index({ appId: 1, key: 1 }, { unique: true });

const PermissionModel=mongoose.model("Permission", permissionSchema);
export default  PermissionModel;