// models/userToken.model.js

import mongoose from "mongoose";

const userTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: [
        "ACCOUNT_RECOVERY",
        "PASSWORD_RESET"
      ],
      required: true,
      index: true
    },

    tokenHash: {
      type: String,
      required: true,
      index: true
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    consumedAt: {
      type: Date,
      default: null,
      index: true
    },

    ip: String,
    userAgent: String,

    metadata: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

userTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const UserTokenModel = mongoose.model("UserToken", userTokenSchema);

export default UserTokenModel;