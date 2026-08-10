const express = require("express");
const authRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  register,
  login,
  getProfile,
  changePassword,
  logout,
  getAllUsers,
  updateUserStatus,
} = require("../controllers/authController");

authRouter.post("/register", register);
// Same controller, but authenticated - used by an admin to add a team member when
// open registration is switched off with RESTRICT_REGISTRATION=true.
authRouter.post("/createUser", jwtMiddleware, register);
authRouter.post("/login", login);
authRouter.get("/getProfile", jwtMiddleware, getProfile);
authRouter.post("/changePassword", jwtMiddleware, changePassword);
authRouter.post("/logout", jwtMiddleware, logout);

// Team management surfaces on the admin dashboard.
authRouter.get("/getAllUsers", jwtMiddleware, adminMiddleware, getAllUsers);
authRouter.put(
  "/updateUserStatus/:id",
  jwtMiddleware,
  adminMiddleware,
  updateUserStatus
);

module.exports = authRouter;
