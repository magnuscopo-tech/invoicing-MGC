import { createSlice } from "@reduxjs/toolkit";
import { DOC_TYPES } from "../../constants/document.constants";

// The wizard draft is global so a user can jump to the client/service screens
// mid-wizard (to create a missing record) and come back without losing work.
const initialState = {
  step: 0,
  form: {
    docType: DOC_TYPES.quotation,
    company: "",
    client: "",
    issueDate: "",
    dueDate: "",
    introLine: "",
    gstApplicable: false,
    notesTerms: "",
    items: [],
  },
  numberPreview: null,
  isDirty: false,
};

const documentDraftSlice = createSlice({
  name: "documentDraft",
  initialState,
  reducers: {
    setDraftStep: (state, action) => {
      state.step = action.payload;
    },
    setDraftField: (state, action) => {
      const { field, value } = action.payload;
      state.form[field] = value;
      state.isDirty = true;
    },
    setDraftForm: (state, action) => {
      state.form = { ...state.form, ...action.payload };
      state.isDirty = true;
    },
    setDraftItems: (state, action) => {
      state.form.items = action.payload;
      state.isDirty = true;
    },
    setNumberPreview: (state, action) => {
      state.numberPreview = action.payload;
    },
    resetDraft: () => initialState,
  },
});

export const {
  setDraftStep,
  setDraftField,
  setDraftForm,
  setDraftItems,
  setNumberPreview,
  resetDraft,
} = documentDraftSlice.actions;

export const selectDraftForm = (state) => state.documentDraft.form;
export const selectDraftStep = (state) => state.documentDraft.step;
export const selectNumberPreview = (state) => state.documentDraft.numberPreview;

export default documentDraftSlice.reducer;
