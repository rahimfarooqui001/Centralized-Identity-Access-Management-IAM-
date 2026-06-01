import mongoose from "mongoose";

const authorizationCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true
    },

    redirectUri: {
      type: String,
      required: true
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true
    },

    used: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

authorizationCodeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const authCodeModel= mongoose.model(
  "AuthorizationCode",
  authorizationCodeSchema
);
export default authCodeModel
