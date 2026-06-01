// models/systemRole.model.js

import mongoose from "mongoose";

const systemRoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["ADMIN", "USER"],
      uppercase: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    isSystem: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

systemRoleSchema.index({ name: 1 });

const SystemRoleModel = mongoose.model("SystemRole", systemRoleSchema);

export default SystemRoleModel;