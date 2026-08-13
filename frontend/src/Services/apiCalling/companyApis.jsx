import {
  GetAllCompaniesApi,
  GetCompanyDetailApi,
  CreateCompanyApi,
  UpdateCompanyApi,
  DeleteCompanyApi,
  UploadCompanyLogoApi,
  UploadCompanySignatureApi,
} from "../apiMethod";
import { itemsOf } from "../../Utlis/Common/commonMethod";

// Paginated lists keep `total` alongside the rows so the UI can page through.
const handleGetAllCompanies = async (params = { page: 1, limit: 20 }) => {
  try {
    const response = await GetAllCompaniesApi(params);
    if (response.statusCode === 200) {
      const items = itemsOf(response.raw.data);
      return {
        items,
        total: response.raw.total || 0,
        page: response.raw.page || 1,
        limit: response.raw.limit || 20,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching companies:", error);
    return null;
  }
};

const handleGetCompanyDetail = async (id) => {
  try {
    const response = await GetCompanyDetailApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching company detail:", error);
    return null;
  }
};

const handleCreateCompany = async (params) => {
  try {
    const response = await CreateCompanyApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error creating company:", error);
    return null;
  }
};

const handleUpdateCompany = async (id, params) => {
  try {
    const response = await UpdateCompanyApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error updating company:", error);
    return null;
  }
};

const handleDeleteCompany = async (id) => {
  try {
    const response = await DeleteCompanyApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error deleting company:", error);
    return null;
  }
};

const handleUploadCompanyLogo = async (id, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await UploadCompanyLogoApi(id, formData);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error uploading company logo:", error);
    return null;
  }
};

const handleUploadCompanySignature = async (id, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await UploadCompanySignatureApi(id, formData);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error uploading company signature:", error);
    return null;
  }
};

export {
  handleGetAllCompanies,
  handleGetCompanyDetail,
  handleCreateCompany,
  handleUpdateCompany,
  handleDeleteCompany,
  handleUploadCompanyLogo,
  handleUploadCompanySignature,
};
