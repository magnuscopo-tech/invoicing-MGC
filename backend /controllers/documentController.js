const {
  createDocumentSchema,
  updateDocumentSchema,
  convertDocumentSchema,
  updateStatusSchema,
  nextNumberQuerySchema,
  listDocumentQuerySchema,
  rejectDocumentSchema,
} = require("../validators/documentValidators");
const {
  fetchNextNumber,
  fetchCreateDocument,
  fetchAllDocuments,
  fetchDocumentDetail,
  fetchUpdateDocument,
  fetchConvertDocument,
  fetchUpdateDocumentStatus,
  fetchPreviewHtml,
  fetchDownloadDocument,
  fetchDocumentChain,
  fetchDeleteDocument,
  fetchSubmitForApproval,
  fetchApproveDocument,
  fetchRejectDocument,
} = require("../services/documentService");

const getNextNumber = async (req, res) => {
  try {
    const { error, value } = nextNumberQuerySchema.validate(req.query);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.query = value;
    await fetchNextNumber(req, res);
  } catch (error) {
    console.error("Error Get Next Number:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const createDocument = async (req, res) => {
  try {
    const { error, value } = createDocumentSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchCreateDocument(req, res);
  } catch (error) {
    console.error("Error Create Document:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getAllDocuments = async (req, res) => {
  try {
    const { error, value } = listDocumentQuerySchema.validate(req.query);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.query = value;
    await fetchAllDocuments(req, res);
  } catch (error) {
    console.error("Error Get All Documents:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getDocumentDetail = async (req, res) => {
  try {
    await fetchDocumentDetail(req, res);
  } catch (error) {
    console.error("Error Get Document Detail:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const updateDocument = async (req, res) => {
  try {
    const { error, value } = updateDocumentSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchUpdateDocument(req, res);
  } catch (error) {
    console.error("Error Update Document:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const convertDocument = async (req, res) => {
  try {
    const { error, value } = convertDocumentSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchConvertDocument(req, res);
  } catch (error) {
    console.error("Error Convert Document:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const updateDocumentStatus = async (req, res) => {
  try {
    const { error, value } = updateStatusSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchUpdateDocumentStatus(req, res);
  } catch (error) {
    console.error("Error Update Document Status:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const previewDocumentHtml = async (req, res) => {
  try {
    await fetchPreviewHtml(req, res);
  } catch (error) {
    console.error("Error Preview Document Html:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const downloadDocument = async (req, res) => {
  try {
    await fetchDownloadDocument(req, res);
  } catch (error) {
    console.error("Error Download Document:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getDocumentChain = async (req, res) => {
  try {
    await fetchDocumentChain(req, res);
  } catch (error) {
    console.error("Error Get Document Chain:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const deleteDocument = async (req, res) => {
  try {
    await fetchDeleteDocument(req, res);
  } catch (error) {
    console.error("Error Delete Document:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const submitForApproval = async (req, res) => {
  try {
    await fetchSubmitForApproval(req, res);
  } catch (error) {
    console.error("Error Submit For Approval:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const approveDocument = async (req, res) => {
  try {
    // Multipart request - the optional signature file is handled by multer, so
    // there is no JSON body to validate here.
    await fetchApproveDocument(req, res);
  } catch (error) {
    console.error("Error Approve Document:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const rejectDocument = async (req, res) => {
  try {
    const { error, value } = rejectDocumentSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchRejectDocument(req, res);
  } catch (error) {
    console.error("Error Reject Document:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
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
};
