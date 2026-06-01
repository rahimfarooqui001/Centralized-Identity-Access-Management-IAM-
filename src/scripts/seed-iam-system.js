// scripts/seed-iam-system.js

import mongoose from "mongoose";
import bcrypt from "bcrypt";

import env from "../config/env.js";

import UserModel from "../models/user.model.js";
import ApplicationModel from "../models/application.model.js";
import PermissionModel from "../models/permission.model.js";
import RoleModel from "../models/role.model.js";
import UserAppAccessModel from "../models/userAppAccess.model.js";
import UserSystemRoleModel from "../models/userSystemRole.model.js";
import SystemRoleModel from "../models/systemRole.model.js";

import crypto from "crypto";



await mongoose.connect(env.mongoUri);


console.log("✅ MongoDB connected");
await mongoose.connection.db.dropDatabase();



const createPermission = async (appId, key, description) => {
  return await PermissionModel.create({
    appId,
    key,
    description,
    status: "ACTIVE"
  });
};

const createRole = async (appId, name, permissionIds) => {
  return await RoleModel.create({
    appId,
    name,
    permissionIds,
    status: "ACTIVE"
  });
};

const createUser = async (name, email, password) => {
  const passwordHash = await bcrypt.hash(password, 12);

  return await UserModel.create({
    name,
    email,
    passwordHash,
    status: "ACTIVE"
  });
};




console.log("🧹 Cleaning old IAM data...");

await UserAppAccessModel.deleteMany({});
await UserSystemRoleModel.deleteMany({});

await PermissionModel.deleteMany({});
await RoleModel.deleteMany({});
await ApplicationModel.deleteMany({});

await UserModel.deleteMany({});

console.log("✅ Old data cleaned");



console.log("⚡ Creating system roles...");

const adminSystemRole = await SystemRoleModel.findOneAndUpdate(
  { name: "ADMIN" },
  {
    name: "ADMIN",
    description: "System Admin"
  },
  {
    upsert: true,
    new: true
  }
);

const supportSystemRole = await SystemRoleModel.findOneAndUpdate(
  { name: "SUPPORT" },
  {
    name: "SUPPORT",
    description: "Support"
  },
  {
    upsert: true,
    new: true
  }
);

console.log("✅ System roles created");




console.log("👤 Creating users...");

const users = [];

for (let i = 1; i <= 25; i++) {

  const user = await createUser(
    `User ${i}`,
    `user${i}@iamtest.com`,
    "Password@123"
  );

  users.push(user);
}

console.log("✅ Users created");




console.log("🛡️ Assigning system admins...");

await UserSystemRoleModel.create({
  userId: users[0]._id,
  roleId: adminSystemRole._id
});

await UserSystemRoleModel.create({
  userId: users[1]._id,
  roleId: adminSystemRole._id
});

await UserSystemRoleModel.create({
  userId: users[2]._id,
  roleId: supportSystemRole._id
});

console.log("✅ System roles assigned");




const applications = [
  {
    name: "Logistics ERP",
    appKey: "LOGISTICS"
  },
  {
    name: "Inventory Management",
    appKey: "INVENTORY"
  },
  {
    name: "HR Management",
    appKey: "HR"
  },
  {
    name: "CRM Platform",
    appKey: "CRM"
  },
  {
    name: "Finance Suite",
    appKey: "FINANCE"
  }
];
const SALT_ROUNDS = 12;


// ─────────────────────────────────────────────


    const rawSecret = "app_" + crypto.randomBytes(32).toString("hex");
console.log("🚀 Creating applications...");

const createdApps = [];

for (const appData of applications) {

  const app = await ApplicationModel.create({
    ownerId: users[Math.floor(Math.random() * users.length)]._id,
    name: appData.name,
    appKey: appData.appKey,
    clientId: crypto.randomUUID(),
    clientSecretHash: await bcrypt.hash(rawSecret, SALT_ROUNDS),
    redirectUris: [
      "http://localhost:3000/callback"
    ],
    defaultRedirectUri: "http://localhost:3000/callback",
    status: "ACTIVE"
  });

  createdApps.push(app);
}

console.log("✅ Applications created");




console.log("🔐 Creating permissions and roles...");

for (const app of createdApps) {

  const permissions = {};

  const permissionKeys = [
    "dashboard:view",

    "users:create",
    "users:update",
    "users:delete",
    "users:view",

    "orders:create",
    "orders:update",
    "orders:delete",
    "orders:view",

    "reports:view",

    "settings:update"
  ];

  for (const key of permissionKeys) {

    const permission = await createPermission(
      app._id,
      key,
      `${key} permission`
    );

    permissions[key] = permission;
  }




  const superAdminRole = await createRole(
    app._id,
    "super_admin",
    Object.values(permissions).map(p => p._id)
  );



  const managerRole = await createRole(
    app._id,
    "manager",
    [
      permissions["dashboard:view"]._id,
      permissions["users:view"]._id,
      permissions["orders:view"]._id,
      permissions["orders:update"]._id,
      permissions["reports:view"]._id
    ]
  );



  const operatorRole = await createRole(
    app._id,
    "operator",
    [
      permissions["dashboard:view"]._id,
      permissions["orders:view"]._id,
      permissions["orders:create"]._id,
      permissions["orders:update"]._id
    ]
  );



  const viewerRole = await createRole(
    app._id,
    "viewer",
    [
      permissions["dashboard:view"]._id,
      permissions["orders:view"]._id
    ]
  );




  for (let i = 0; i < users.length; i++) {

    let roleIds = [];

    if (i <= 2) {
      roleIds = [superAdminRole._id];
    }
    else if (i <= 8) {
      roleIds = [managerRole._id];
    }
    else if (i <= 18) {
      roleIds = [operatorRole._id];
    }
    else {
      roleIds = [viewerRole._id];
    }

    await UserAppAccessModel.create({
      userId: users[i]._id,
      appId: app._id,
      roleIds,
      status: "ACTIVE"
    });
  }
}

console.log("✅ Permissions, roles and app access created");




console.log("🧪 Creating edge case test data...");


const disabledUser = await createUser(
  "Disabled User",
  "disabled@iamtest.com",
  "Password@123"
);

disabledUser.status = "DISABLED";
await disabledUser.save();


const deletedUser = await createUser(
  "Deleted User",
  "deleted@iamtest.com",
  "Password@123"
);
const originalEmail = deletedUser.email;
const shortId = deletedUser._id.toString().slice(-6);

deletedUser.deletedEmail = originalEmail;
deletedUser.email = `deleted_${shortId}_${originalEmail}`;

deletedUser.deletedAt = new Date();
deletedUser.status = "DISABLED";

await deletedUser.save();



const sampleRole = await RoleModel.findOne();

sampleRole.deletedAt = new Date();
sampleRole.status = "DISABLED";

await sampleRole.save();


const samplePermission = await PermissionModel.findOne();

samplePermission.deletedAt = new Date();
samplePermission.status = "DISABLED";

await samplePermission.save();

console.log("✅ Edge case data created");



const totalUsers = await UserModel.countDocuments();
const totalApps = await ApplicationModel.countDocuments();
const totalRoles = await RoleModel.countDocuments();
const totalPermissions = await PermissionModel.countDocuments();
const totalAccess = await UserAppAccessModel.countDocuments();

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(" IAM SEED COMPLETED");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━");

console.log("Users:", totalUsers);
console.log("Applications:", totalApps);
console.log("Roles:", totalRoles);
console.log("Permissions:", totalPermissions);
console.log("UserAppAccess:", totalAccess);

console.log("\n TEST LOGIN");
console.log("Email: user1@iamtest.com");
console.log("Password: Password@123");

console.log("\n Done");

process.exit(0);