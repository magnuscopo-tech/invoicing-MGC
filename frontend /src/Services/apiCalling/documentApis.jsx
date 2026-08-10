import {
  GetNextNumberApi,
  GetAllDocumentsApi,
  GetDocumentDetailApi,
  GetDocumentChainApi,
  PreviewDocumentHtmlApi,
  DownloadDocumentApi,
  CreateDocumentApi,
  ConvertDocumentApi,
  UpdateDocumentApi,
  UpdateDocumentStatusApi,
  DeleteDocumentApi,
  SubmitForApprovalApi,
  ApproveDocumentApi,
  RejectDocumentApi,
} from "../apiMethod";

const handleGetNextNumber = async (type, companyId, date) => {
  try {
    const response = await GetNextNumberApi(type, companyId, date);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching next document number:", error);
    return null;
  }
};

const handleGetAllDocuments = async (params = { page: 1, limit: 20 }) => {
  try {
    const response = await GetAllDocumentsApi(params);
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
    console.error("Error fetching documents:", error);
    return null;
  }
};

const handleGetDocumentDetail = async (id) => {
  try {
    const response = await GetDocumentDetailApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching document detail:", error);
    return null;
  }
};

const handleGetDocumentChain = async (id) => {
  try {
    const response = await GetDocumentChainApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching document chain:", error);
    return null;
  }
};

// Returns the raw HTML string for the preview iframe, not a JSON payload.
const handlePreviewDocumentHtml = async (id) => {
  try {
    const response = await PreviewDocumentHtmlApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching document preview html:", error);
    return null;
  }
};

const handleDownloadDocument = async (id) => {
  try {
    const response = await DownloadDocumentApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error downloading document:", error);
    return null;
  }
};

const handleCreateDocument = async (params) => {
  try {
    const response = await CreateDocumentApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error creating document:", error);
    return null;
  }
};

const handleConvertDocument = async (id, params) => {
  try {
    const response = await ConvertDocumentApi(id, params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error converting document:", error);
    return null;
  }
};

const handleUpdateDocument = async (id, params) => {
  try {
    const response = await UpdateDocumentApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error updating document:", error);
    return null;
  }
};

const handleUpdateDocumentStatus = async (id, params) => {
  try {
    const response = await UpdateDocumentStatusApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error updating document status:", error);
    return null;
  }
};

const handleDeleteDocument = async (id) => {
  try {
    const response = await DeleteDocumentApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error deleting document:", error);
    return null;
  }
};

const handleSubmitForApproval = async (id) => {
  try {
    const response = await SubmitForApprovalApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error submitting document for approval:", error);
    return null;
  }
};

// `signatureFile` is optional — without one the server falls back to the
// company's saved authorised signature.
const handleApproveDocument = async (id, signatureFile = null) => {
  try {
    const formData = new FormData();
    if (signatureFile) formData.append("file", signatureFile);

    const response = await ApproveDocumentApi(id, formData);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error approving document:", error);
    return null;
  }
};

const handleRejectDocument = async (id, params) => {
  try {
    const response = await RejectDocumentApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error rejecting document:", error);
    return null;
  }
};

export {
  handleGetNextNumber,
  handleSubmitForApproval,
  handleApproveDocument,
  handleRejectDocument,
  handleGetAllDocuments,
  handleGetDocumentDetail,
  handleGetDocumentChain,
  handlePreviewDocumentHtml,
  handleDownloadDocument,
  handleCreateDocument,
  handleConvertDocument,
  handleUpdateDocument,
  handleUpdateDocumentStatus,
  handleDeleteDocument,
};
