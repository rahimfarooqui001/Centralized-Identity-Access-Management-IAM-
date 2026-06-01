import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      index: true
    },

    lastLoginAt: Date,

    deletedAt: {
      type: Date,
      default: null
    },

    deletedEmail:{
      type:String,
      default:null,
      lowercase: true,
    }
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });

userSchema.index(
  { deletedEmail: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedEmail: { $type: "string" }
    }
  }
);

const UserModel = mongoose.model("User", userSchema);
export default UserModel;