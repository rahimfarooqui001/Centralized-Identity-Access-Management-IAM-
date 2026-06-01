




import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    appKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    clientSecretHash: {
      type: String,
      required: true
    },

    redirectUris: {
      type: [String],
      default: []
    },

    defaultRedirectUri: {
      type: String,
      required: true
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      index: true
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true
    }
  },
  { timestamps: true }
);

applicationSchema.index({ name: "text" });

const ApplicationModel = mongoose.model("Application", applicationSchema);
export default ApplicationModel;

