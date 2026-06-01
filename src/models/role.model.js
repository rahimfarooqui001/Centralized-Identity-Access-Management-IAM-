import mongoose from "mongoose";

const roleSchema = new mongoose.Schema(
  {
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true   // e.g. "inventory_admin"
    },
    permissionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Permission"
      }
    ],
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

roleSchema.index({ appId: 1, name: 1 }, { unique: true });

const RoleModel=mongoose.model("Role", roleSchema);
export default  RoleModel;