// utils/user.guard.js

import UserAppAccessModel from "../models/userAppAccess.model.js";
import { AppError } from "./errors.js";

export const ensureUserHasNoActiveAccess = async (userId) => {
  const totalAccess = await UserAppAccessModel.countDocuments({
    userId,
    status: "ACTIVE"
  });

  if (totalAccess === 0) return;

  const preview = await UserAppAccessModel.find({ userId })
    .populate("appId", "name appKey")
    .limit(5)
    .lean();

  throw new AppError(
    "User is still assigned to applications",
    400,
    "user_has_active_access",
    {
      totalAccess,
      apps: preview.map(a => ({
        id: a.appId._id,
        name: a.appId.name,
        appKey: a.appId.appKey
      }))
    }
  );
};