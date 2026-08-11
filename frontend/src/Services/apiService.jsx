import axios from "axios";
import { ErrorMessage } from "../Utlis/Toastify/ToastMessage";
import store from "../ReduxStore/store";
import { logout } from "../ReduxFeature/Authenthicate/LoginSlice";
import { STORAGE_KEYS } from "../constants/storage.constants";
import { MESSAGES } from "../constants/message.constants";
import { apiHost } from "./apiConstant";

const ApiRequest = axios.create({
  baseURL: apiHost,
  timeout: 20000,
});

ApiRequest.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

ApiRequest.interceptors.response.use(
  (response) => {
    // Non-JSON payloads (preview HTML, PDF blobs) are passed through untouched.
    const isPlainPayload =
      typeof response.data !== "object" || response.data instanceof Blob;

    if (isPlainPayload) {
      return {
        statusCode: response.status || false,
        token: null,
        userId: null,
        message: null,
        raw: { data: response.data },
      };
    }

    return {
      statusCode: response.status || false,
      token: response.data.token || response.data["auth-token"] || null,
      userId: response.data.userId || null,
      message: response.data.message || null,
      raw: response.data,
    };
  },
  (error) => {
    const statusCode = error?.response?.status;
    const message = error?.response?.data?.message;
    if (statusCode === 401) {
      localStorage.clear();
      store.dispatch(logout());
      ErrorMessage(message || "Session expired. Please log in again.");
    } else if ([403, 404, 422, 429, 500].includes(statusCode)) {
      ErrorMessage(message || MESSAGES.unexpectedError);
    } else if (error.code === "ERR_NETWORK") {
      ErrorMessage(MESSAGES.networkError);
    } else {
      ErrorMessage(MESSAGES.unexpectedError);
    }

    return Promise.reject({ statusCode, message, data: null });
  }
);

const apiRequest = (
  url,
  method,
  params = {},
  formDataFlag = false,
  extraHeaders = {},
  responseType = "json"
) => {
  return ApiRequest({
    url,
    method,
    headers: { ...extraHeaders },
    params: method === "Get" && !formDataFlag ? params : null,
    data: formDataFlag || method !== "Get" ? params : null,
    responseType,
  });
};

export default apiRequest;
