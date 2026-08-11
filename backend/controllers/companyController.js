const {
  createCompanySchema,
  updateCompanySchema,
} = require("../validators/companyValidators");
const {
  fetchCreateCompany,
  fetchAllCompanies,
  fetchCompanyDetail,
  fetchUpdateCompany,
  fetchDeleteCompany,
  fetchUploadCompanyLogo,
  fetchUploadCompanySignature,
} = require("../services/companyService");

const createCompany = async (req, res) => {
  try {
    const { error, value } = createCompanySchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchCreateCompany(req, res);
  } catch (error) {
    console.error("Error Create Company:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getAllCompanies = async (req, res) => {
  try {
    await fetchAllCompanies(req, res);
  } catch (error) {
    console.error("Error Get All Companies:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getCompanyDetail = async (req, res) => {
  try {
    await fetchCompanyDetail(req, res);
  } catch (error) {
    console.error("Error Get Company Detail:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const updateCompany = async (req, res) => {
  try {
    const { error, value } = updateCompanySchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchUpdateCompany(req, res);
  } catch (error) {
    console.error("Error Update Company:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const deleteCompany = async (req, res) => {
  try {
    await fetchDeleteCompany(req, res);
  } catch (error) {
    console.error("Error Delete Company:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const uploadCompanyLogo = async (req, res) => {
  try {
    await fetchUploadCompanyLogo(req, res);
  } catch (error) {
    console.error("Error Upload Company Logo:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const uploadCompanySignature = async (req, res) => {
  try {
    await fetchUploadCompanySignature(req, res);
  } catch (error) {
    console.error("Error Upload Company Signature:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyDetail,
  updateCompany,
  deleteCompany,
  uploadCompanyLogo,
  uploadCompanySignature,
};
