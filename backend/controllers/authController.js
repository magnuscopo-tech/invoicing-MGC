const {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  listUserQuerySchema,
  updateUserStatusSchema,
} = require("../validators/authValidators");
const {
  fetchRegister,
  fetchLogin,
  fetchProfile,
  fetchChangePassword,
  fetchLogout,
  fetchAllUsers,
  fetchUpdateUserStatus,
} = require("../services/authService");

const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchRegister(req, res);
  } catch (error) {
    console.error("Error Register:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchLogin(req, res);
  } catch (error) {
    console.error("Error Login:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getProfile = async (req, res) => {
  try {
    await fetchProfile(req, res);
  } catch (error) {
    console.error("Error Get Profile:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const changePassword = async (req, res) => {
  try {
    const { error, value } = changePasswordSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchChangePassword(req, res);
  } catch (error) {
    console.error("Error Change Password:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const logout = async (req, res) => {
  try {
    await fetchLogout(req, res);
  } catch (error) {
    console.error("Error Logout:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { error, value } = listUserQuerySchema.validate(req.query);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.query = value;
    await fetchAllUsers(req, res);
  } catch (error) {
    console.error("Error Get All Users:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { error, value } = updateUserStatusSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchUpdateUserStatus(req, res);
  } catch (error) {
    console.error("Error Update User Status:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  changePassword,
  logout,
  getAllUsers,
  updateUserStatus,
};
