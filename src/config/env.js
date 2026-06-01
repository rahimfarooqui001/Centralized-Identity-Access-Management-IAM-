import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = [
  "PORT",
  "NODE_ENV",
  "MONGODB_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "APP_BASE_URL",
  "SALT_ROUNDS",
  "SESSION_SECRET",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

const env = {
  port: process.env.PORT,
  nodeEnv:process.env.NODE_ENV,
    mongoUri :process.env.MONGODB_URI,
    appBaseUrl:process.env.APP_BASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret:process.env.JWT_REFRESH_SECRET
  },
  redis:{
    redisPort:process.env.REDIS_PORT,
    redisHost:process.env.REDIS_HOST,
    redisPassword:process.env.REDIS_PASSWORD,
    redisUsername:process.env.REDIS_USERNAME,
  },
   saltRounds:process.env.SALT_ROUNDS,
   sessionSecret:process.env.SESSION_SECRET,
bootStrap:{
bootstrapAdminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL,
 bootstrapAdminPassword:process.env.BOOTSTRAP_ADMIN_PASSWORD,
bootstrapAdminEnabled:process.env.BOOTSTRAP_ADMIN_ENABLED,
}


};

export default env;
