// Role gate for admin-only surfaces. jwtMiddleware has already resolved the user
// from the token, so this needs no extra database round trip.
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(403).json({
      success: false,
      message: "Authorization token is missing",
      statusCode: 403,
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "This action is available to admin users only",
      statusCode: 403,
    });
  }

  return next();
};

module.exports = adminMiddleware;
