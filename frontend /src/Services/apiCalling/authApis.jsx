import {
  RegisterApi,
  LogInApi,
  GetProfileApi,
  ChangePasswordApi,
  SignOutApi,
  CreateUserApi,
  GetAllUsersApi,
  UpdateUserStatusApi,
} from "../apiMethod";

// The backend returns the token on the top level, so auth handlers shape it
// into { token, user } instead of returning raw.data alone.
const handleLogIn = async (params) => {
  try {
    const response = await LogInApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return { token: response.token, user: response.raw.data };
    }
    return null;
  } catch (error) {
    console.error("Error logging in:", error);
    return null;
  }
};

const handleRegister = async (params) => {
  try {
    const response = await RegisterApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return { token: response.token, user: response.raw.data };
    }
    return null;
  } catch (error) {
    console.error("Error registering account:", error);
    return null;
  }
};

const handleGetProfile = async () => {
  try {
    const response = await GetProfileApi();
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
};

const handleChangePassword = async (params) => {
  try {
    const response = await ChangePasswordApi(params);
    if (response.statusCode === 200) {
      return response.raw.data ?? true;
    }
    return null;
  } catch (error) {
    console.error("Error changing password:", error);
    return null;
  }
};

const handleSignOut = async () => {
  try {
    const response = await SignOutApi();
    if (response.statusCode === 200) {
      return true;
    }
    return null;
  } catch (error) {
    console.error("Error signing out:", error);
    return null;
  }
};

const handleCreateUser = async (params) => {
  try {
    const response = await CreateUserApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
};

const handleGetAllUsers = async (params = { page: 1, limit: 20 }) => {
  try {
    const response = await GetAllUsersApi(params);
    if (response.statusCode === 200) {
      return {
        items: response.raw.data || [],
        total: response.raw.total || 0,
        page: response.raw.page || 1,
        limit: response.raw.limit || 20,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
};

const handleUpdateUserStatus = async (id, params) => {
  try {
    const response = await UpdateUserStatusApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error updating user status:", error);
    return null;
  }
};

export {
  handleLogIn,
  handleRegister,
  handleGetProfile,
  handleChangePassword,
  handleSignOut,
  handleCreateUser,
  handleGetAllUsers,
  handleUpdateUserStatus,
};
