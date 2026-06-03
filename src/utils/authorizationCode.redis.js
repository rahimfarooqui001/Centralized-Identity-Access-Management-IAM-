import crypto from "crypto";
import { AppError } from "./errors.js";
import redisClient from "../config/redisSession.js";

const PREFIX = "oauth:code:";

export const generateAuthorizationCode = () =>
  crypto.randomBytes(32).toString("hex");

export const createAuthzCode = async ({
  userId,
  appId,
  redirectUri,
  ttlSeconds = 120,
}) => {
  const code = generateAuthorizationCode();

  const payload = {
    userId,
    appId,
    redirectUri,
    used: false,
  };

  await redisClient.set(
    PREFIX + code,
    JSON.stringify(payload),
    {
      EX: ttlSeconds,
    }
  );

  return code;
};


// export const validateAuthzCode = async ({
//   code,
//   clientAppId,
//   redirectUri,
// }) => {
//   const raw = await redisClient.get(PREFIX + code);
//    console.log(raw,'raw code')

//   if (!raw) {
//     throw new AppError(
//       "Invalid or expired authorization code",
//       400,
//       "INVALID_AUTH_CODE"
//     );
//   }

//   const authCode = JSON.parse(raw);

//   if (authCode.used) {
//     throw new AppError(
//       "Authorization code already used",
//       400,
//       "CODE_ALREADY_USED"
//     );
//   }

//   if (authCode.appId.toString() !== clientAppId.toString()) {
//     throw new AppError(
//       "Authorization code does not belong to this app",
//       400,
//       "INVALID_APP"
//     );
//   }

//   if (authCode.redirectUri !== redirectUri) {
//     throw new AppError(
//       "Redirect URI mismatch",
//       400,
//       "INVALID_REDIRECT_URI"
//     );
//   }

//   return authCode;
// };


// export const consumeAuthzCode = async (code) => {

//   const key = PREFIX + code;
//   console.log(key,'consume keys')

//   const exists = await redisClient.get(key);
//   console.log(exists ,'exists to consume')

//   if (!exists) return;

//   // delete immediately → prevents replay attack
//   await redisClient.del(key);
// };


export const validateAuthzCode = async ({
  code,
  clientAppId,
  redirectUri,
}) => {
  try {
    const key = PREFIX + code;

    // console.log("[validateAuthzCode] key:", key);

    const raw = await redisClient.get(key);

    // console.log("[validateAuthzCode] raw:", raw);

    if (!raw) {
      throw new AppError(
        "Invalid or expired authorization code",
        400,
        "INVALID_AUTH_CODE"
      );
    }

    const authCode = JSON.parse(raw);

    // console.log("[validateAuthzCode] parsed:", authCode);

    if (authCode.used) {
      throw new AppError("Code already used", 400, "CODE_ALREADY_USED");
    }

    if (String(authCode.appId) !== String(clientAppId)) {
      throw new AppError("Invalid app", 400, "INVALID_APP");
    }

    if (authCode.redirectUri !== redirectUri) {
      throw new AppError("Redirect mismatch", 400, "INVALID_REDIRECT_URI");
    }

    return authCode;

  } catch (err) {
    console.error("[validate Authorization Code ERROR]", err);
    throw err;
  }
};


export const consumeAuthzCode = async (code) => {
  try {
    const key = PREFIX + code;

    // console.log("[consumeAuthzCode] key:", key);

    const exists = await redisClient.get(key);

    // console.log("[consumeAuthzCode] exists:", exists);

    if (!exists) return false;

    await redisClient.del(key);

    // console.log("[consumeAuthzCode] deleted");

    return true;
  } catch (err) {
    console.error("[Authorization Code ERROR]", err);
    throw err;
  }
};