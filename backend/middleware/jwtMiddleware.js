const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const jwtMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) {
      return res.status(403).json({
        success: false,
        message: "Authorization token is missing",
        statusCode: 403,
      });
    }

    const token = header.slice(7).trim();
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_KEY);
    } catch (error) {
      const expired = error.name === "TokenExpiredError";
      console.error("JWT Error:", error.name);
      return res.status(401).json({
        success: false,
        message: expired ? "Session expired, please log in again" : "Invalid token",
        statusCode: 401,
      });
    }

    const user = await User.findById(decoded.mongoId).select(
      "name email role isActive signOutAt"
    );
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found", statusCode: 404 });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
        statusCode: 403,
      });
    }

    // Tokens issued before the last manual logout are no longer accepted.
    if (user.signOutAt && decoded.iat && decoded.iat * 1000 < user.signOutAt.getTime()) {
      return res.status(401).json({
        success: false,
        message: "Session invalidated, please log in again",
        statusCode: 401,
      });
    }

    req.user = {
      mongoId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
    };
    return next();
  } catch (error) {
    console.error("JWT Middleware Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = jwtMiddleware;
