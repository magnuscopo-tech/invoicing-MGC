const express = require("express");
const documentRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { uploadImage, setUploadFolder } = require("../uploads/uploadImage");
const {
  getNextNumber,
  submitForApproval,
  approveDocument,
  rejectDocument,
  createDocument,
  getAllDocuments,
  getDocumentDetail,
  updateDocument,
  convertDocument,
  updateDocumentStatus,
  previewDocumentHtml,
  downloadDocument,
  getDocumentChain,
  deleteDocument,
} = require("../controllers/documentController");

// Read-only number preview for the wizard - does not commit a serial.
documentRouter.get("/getNextNumber", jwtMiddleware, getNextNumber);

documentRouter.get("/getAllDocuments", jwtMiddleware, getAllDocuments);
documentRouter.get("/getDocumentDetail/:id", jwtMiddleware, getDocumentDetail);
documentRouter.get("/getDocumentChain/:id", jwtMiddleware, getDocumentChain);
documentRouter.get("/previewDocumentHtml/:id", jwtMiddleware, previewDocumentHtml);
// Prints on request and streams the bytes back - nothing is stored server side.
documentRouter.get("/downloadDocument/:id", jwtMiddleware, downloadDocument);

documentRouter.post("/createDocument", jwtMiddleware, createDocument);
documentRouter.post("/convertDocument/:id", jwtMiddleware, convertDocument);

documentRouter.put("/updateDocument/:id", jwtMiddleware, updateDocument);
documentRouter.put("/updateDocumentStatus/:id", jwtMiddleware, updateDocumentStatus);

// Approval flow. Any authenticated user may submit; only an admin may decide.
documentRouter.post("/submitForApproval/:id", jwtMiddleware, submitForApproval);
documentRouter.post(
  "/approveDocument/:id",
  jwtMiddleware,
  adminMiddleware,
  setUploadFolder("signatures"),
  // The signature file is optional here - without one the company's saved
  // authorised signature is used instead.
  uploadImage.single("file"),
  approveDocument
);
documentRouter.post(
  "/rejectDocument/:id",
  jwtMiddleware,
  adminMiddleware,
  rejectDocument
);

documentRouter.delete("/deleteDocument/:id", jwtMiddleware, deleteDocument);

module.exports = documentRouter;
