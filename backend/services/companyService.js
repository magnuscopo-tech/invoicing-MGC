const path = require("path");
const Company = require("../models/companyModel");
const Document = require("../models/documentModel");
const User = require("../models/userModel");
const { recordAudit } = require("./auditLogService");
const { removeFileIfExists, toPublicUrl } = require("../utils/fileHelper");
const { compressImageToDataUrl } = require("../utils/imageAssetHelper");

const mapCompany = (company) => ({
  ...company,
  logoUrl: toPublicUrl(company.logoUrl),
  signatureUrl: toPublicUrl(company.signatureUrl),
});

const isStoredUploadPath = (value) => /^\/?uploads\//i.test(String(value || ""));

const fetchCreateCompany = async (req, res) => {
  try {
    const company = await Company.create({
      ...req.body,
      createdBy: req.user.mongoId,
    });

    recordAudit({
      entityType: "company",
      entityId: company._id,
      action: "created",
      performedBy: req.user.mongoId,
      meta: { name: company.name },
    });

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      data: mapCompany(company.toObject()),
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Create Company:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchAllCompanies = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = String(req.query.isActive) === "true";
    }
    if (req.query.search) {
      query.name = { $regex: String(req.query.search).trim(), $options: "i" };
    }

    const companies = await Company.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Company.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Companies fetched successfully",
      total,
      page,
      limit,
      data: companies.map(mapCompany),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get All Companies:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchCompanyDetail = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).lean();
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found", statusCode: 404 });
    }

    return res.status(200).json({
      success: true,
      message: "Company fetched successfully",
      data: mapCompany(company),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Company Detail:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchUpdateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found", statusCode: 404 });
    }

    Object.assign(company, req.body);
    await company.save();

    recordAudit({
      entityType: "company",
      entityId: company._id,
      action: "updated",
      performedBy: req.user.mongoId,
      meta: { fields: Object.keys(req.body) },
    });

    return res.status(200).json({
      success: true,
      message: "Company updated successfully",
      data: mapCompany(company.toObject()),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Update Company:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// Deleting a company that any document references would break historical records,
// so it is deactivated instead. Only admins may run either path.
const fetchDeleteCompany = async (req, res) => {
  try {
    const user = await User.findById(req.user.mongoId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only an admin can delete a company",
        statusCode: 403,
      });
    }

    const company = await Company.findById(req.params.id);
    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found", statusCode: 404 });
    }

    const referenceCount = await Document.countDocuments({ company: company._id });
    if (referenceCount > 0) {
      company.isActive = false;
      await company.save();

      recordAudit({
        entityType: "company",
        entityId: company._id,
        action: "deactivated",
        performedBy: req.user.mongoId,
        meta: { referenceCount },
      });

      return res.status(200).json({
        success: true,
        message: `Company is used by ${referenceCount} document(s), so it was deactivated instead of deleted`,
        data: { _id: company._id, isActive: false, softDeleted: true },
        statusCode: 200,
      });
    }

    if (isStoredUploadPath(company.logoUrl)) {
      removeFileIfExists(
        path.join(__dirname, "..", "public", company.logoUrl.replace(/^\/+/, ""))
      );
    }
    if (isStoredUploadPath(company.signatureUrl)) {
      removeFileIfExists(
        path.join(__dirname, "..", "public", company.signatureUrl.replace(/^\/+/, ""))
      );
    }
    await company.deleteOne();

    recordAudit({
      entityType: "company",
      entityId: company._id,
      action: "deleted",
      performedBy: req.user.mongoId,
      meta: { name: company.name },
    });

    return res.status(200).json({
      success: true,
      message: "Company deleted successfully",
      data: { _id: company._id, softDeleted: false },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Delete Company:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// Shared by the logo and signature endpoints - field is "logoUrl" or "signatureUrl".
const saveCompanyAsset = async (req, res, field, folder) => {
  if (!req.file) {
    return res.status(422).json({
      success: false,
      message: "An image file is required",
      statusCode: 422,
    });
  }

  const company = await Company.findById(req.params.id);
  if (!company) {
    removeFileIfExists(req.file.path);
    return res
      .status(404)
      .json({ success: false, message: "Company not found", statusCode: 404 });
  }

  const previousPath = company[field];
  company[field] = await compressImageToDataUrl(req.file, folder);
  await company.save();

  if (isStoredUploadPath(previousPath)) {
    removeFileIfExists(
      path.join(__dirname, "..", "public", previousPath.replace(/^\/+/, ""))
    );
  }

  recordAudit({
    entityType: "company",
    entityId: company._id,
    action: `${folder}_uploaded`,
    performedBy: req.user.mongoId,
    meta: {
      originalName: req.file.originalname,
      originalSize: req.file.size,
      storage: "mongodb_data_url",
    },
  });

  return res.status(200).json({
    success: true,
    message: `${field === "logoUrl" ? "Logo" : "Signature"} uploaded successfully`,
    data: {
      _id: company._id,
      [field]: toPublicUrl(company[field]),
      path: company[field],
    },
    statusCode: 200,
  });
};

const fetchUploadCompanyLogo = async (req, res) => {
  try {
    return await saveCompanyAsset(req, res, "logoUrl", "logos");
  } catch (error) {
    console.error("Error Upload Company Logo:", error.message);
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message, statusCode });
  }
};

const fetchUploadCompanySignature = async (req, res) => {
  try {
    return await saveCompanyAsset(req, res, "signatureUrl", "signatures");
  } catch (error) {
    console.error("Error Upload Company Signature:", error.message);
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ success: false, message: error.message, statusCode });
  }
};

module.exports = {
  fetchCreateCompany,
  fetchAllCompanies,
  fetchCompanyDetail,
  fetchUpdateCompany,
  fetchDeleteCompany,
  fetchUploadCompanyLogo,
  fetchUploadCompanySignature,
};
