import { verifyAccessToken } from "../utils/token.service.js";





export const validateAccessToken = (req, res, next) => {
  console.log('validator middleware hit')
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "invalid_token",
        message: "Access token missing"
      });
    }

    const token = authHeader.substring(7);

    const payload = verifyAccessToken(token);
console.log(payload,)
    req.user = {
      userId: payload.sub,
      appId: payload.app,
      permissions: payload.permissions
    };
    console.log(req.user,'from middle are')

    next();

  } catch (error) {

    return res.status(error.statusCode || 401).json({
      error: error.code || "invalid_token",
      message: error.message
    });

  }
};