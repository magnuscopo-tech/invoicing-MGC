import { createSlice } from "@reduxjs/toolkit";
import { STORAGE_KEYS } from "../../constants/storage.constants";

const initialState = {
  isAuthenticated: false,
  token: null,
  user: null,
  isAuthChecked: false,
};

const LoginSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      const { token, user } = action.payload;
      state.isAuthenticated = true;
      state.token = token;
      state.user = user;
      state.isAuthChecked = true;
      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    },
    setUser: (state, action) => {
      state.user = action.payload;
      localStorage.setItem(
        STORAGE_KEYS.currentUser,
        JSON.stringify(action.payload)
      );
    },
    checkAuth: (state) => {
      const token = localStorage.getItem(STORAGE_KEYS.token);
      const storedUser = localStorage.getItem(STORAGE_KEYS.currentUser);

      if (token) {
        state.isAuthenticated = true;
        state.token = token;
        try {
          state.user = storedUser ? JSON.parse(storedUser) : null;
        } catch {
          state.user = null;
        }
      } else {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      }
      state.isAuthChecked = true;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.isAuthChecked = true;
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.currentUser);
    },
  },
});

export const { login, setUser, checkAuth, logout } = LoginSlice.actions;

export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsAuthChecked = (state) => state.auth.isAuthChecked;
export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAdmin = (state) => state.auth.user?.role === "admin";

export default LoginSlice.reducer;
