const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const { recordAudit } = require("./auditLogService");

const SALT_ROUNDS = 10;

const signToken = (user) =>
  jwt.sign(
    { mongoId: String(user._id), email: user.email, role: user.role },
    process.env.JWT_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const fetchRegister = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // When registration is restricted, only a signed-in admin may create users.
    if (String(process.env.RESTRICT_REGISTRATION).toLowerCase() === "true") {
      if (!req.user) {
        return res.status(403).json({
          success: false,
          message: "Registration is restricted to administrators",
          statusCode: 403,
        });
      }
      const requester = await User.findById(req.user.mongoId).select("role");
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Only an admin can create new users",
          statusCode: 403,
        });
      }
    }

    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(422).json({
        success: false,
        message: "An account with this email already exists",
        statusCode: 422,
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || "finance_user",
    });

    recordAudit({
      entityType: "user",
      entityId: user._id,
      action: "user_created",
      performedBy: req.user ? req.user.mongoId : user._id,
      meta: { email: user.email, role: user.role },
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token: signToken(user),
      data: toPublicUser(user),
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Register:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        statusCode: 401,
      });
    }
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
        statusCode: 403,
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        statusCode: 401,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token: signToken(user),
      data: toPublicUser(user),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Login:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.mongoId).lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found", statusCode: 404 });
    }

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: toPublicUser(user),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Profile:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.mongoId).select("+passwordHash");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found", statusCode: 404 });
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return res.status(422).json({
        success: false,
        message: "Current password is incorrect",
        statusCode: 422,
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    // Invalidate every token issued before this change.
    user.signOutAt = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully, please log in again",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Change Password:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchLogout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.mongoId, { signOutAt: new Date() });
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Logout:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// Admin-only team roster for the admin dashboard.
const fetchAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const query = {};
    if (req.query.role) query.role = req.query.role;
    if (req.query.isActive !== undefined) {
      query.isActive = String(req.query.isActive) === "true";
    }
    if (req.query.search) {
      const search = String(req.query.search).trim();
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      total,
      page,
      limit,
      data: users.map(toPublicUser),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get All Users:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchUpdateUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found", statusCode: 404 });
    }

    // Locking yourself out of your own admin account is not recoverable in-app.
    if (String(user._id) === req.user.mongoId) {
      return res.status(422).json({
        success: false,
        message: "You cannot change your own account status or role",
        statusCode: 422,
      });
    }

    if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    if (req.body.role) user.role = req.body.role;

    // Deactivating or demoting must take effect now, not whenever the token expires.
    user.signOutAt = new Date();
    await user.save();

    recordAudit({
      entityType: "user",
      entityId: user._id,
      action: "status_changed",
      performedBy: req.user.mongoId,
      meta: { isActive: user.isActive, role: user.role },
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: toPublicUser(user),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Update User Status:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchRegister,
  fetchLogin,
  fetchProfile,
  fetchChangePassword,
  fetchLogout,
  fetchAllUsers,
  fetchUpdateUserStatus,
};
