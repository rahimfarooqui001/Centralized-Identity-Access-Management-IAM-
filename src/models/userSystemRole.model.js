// models/userSystemRole.model.js

import mongoose from "mongoose";

const userSystemRoleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SystemRole",
      required: true
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

userSystemRoleSchema.index({ userId: 1 }, { unique: true });

userSystemRoleSchema.index({ roleId: 1 });

const UserSystemRoleModel = mongoose.model(
  "UserSystemRole",
  userSystemRoleSchema
);

export default UserSystemRoleModel;