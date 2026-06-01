// utils/systemRole.helper.js

import SystemRoleModel from "../models/systemRole.model.js";

export const getSystemRoleIds = async () => {
  const roles = await SystemRoleModel.find({
    name: { $in: ["ADMIN", "USER"] }
  });

  const map = {};
  roles.forEach(r => (map[r.name] = r._id));

  return map;
};