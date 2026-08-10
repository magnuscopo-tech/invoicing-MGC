import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../ReduxFeature/Authenthicate/LoginSlice";
import documentDraftReducer from "../ReduxFeature/documentDraft/documentDraftSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    documentDraft: documentDraftReducer,
  },
});

export default store;
