//  middleware/requireSessionAuth.js

export const requireSessionAuth = (req, res, next) => {

  const userId = req.session?.userId;

  if (!userId) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Login required"
    });
  }

  req.auth = { userId };
  next();
};