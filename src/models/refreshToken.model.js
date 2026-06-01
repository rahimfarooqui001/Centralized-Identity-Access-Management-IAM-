import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User",required:true },
  tokenHash: { type: String, required: true, unique: true },
  userAgent: String,
  ip: String,
   expiresAt: {
      type: Date,
      required: true
    },
    appId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true
    },

    revokedAt: {
      type: Date,
      default: null
    },
   rotatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RefreshToken",
      default: null
    },
     
  lastUsedAt: {
    type: Date,
    default: Date.now
  }

},
{ timestamps: true }
);

RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RefreshTokenSchema.index({userId:1})
RefreshTokenSchema.index({appId:1})


const refreshTmodel=mongoose.model("RefreshToken", RefreshTokenSchema);
export default  refreshTmodel

