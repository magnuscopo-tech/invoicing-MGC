import {
  GetAllServicesApi,
  GetServiceDetailApi,
  CreateServiceApi,
  UpdateServiceApi,
  DeleteServiceApi,
} from "../apiMethod";

const handleGetAllServices = async (params = { page: 1, limit: 50 }) => {
  try {
    const response = await GetAllServicesApi(params);
    if (response.statusCode === 200) {
      return {
        items: response.raw.data || [],
        total: response.raw.total || 0,
        page: response.raw.page || 1,
        limit: response.raw.limit || 50,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching services:", error);
    return null;
  }
};

const handleGetServiceDetail = async (id) => {
  try {
    const response = await GetServiceDetailApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching service detail:", error);
    return null;
  }
};

const handleCreateService = async (params) => {
  try {
    const response = await CreateServiceApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error creating service:", error);
    return null;
  }
};

const handleUpdateService = async (id, params) => {
  try {
    const response = await UpdateServiceApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error updating service:", error);
    return null;
  }
};

const handleDeleteService = async (id) => {
  try {
    const response = await DeleteServiceApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error deleting service:", error);
    return null;
  }
};

export {
  handleGetAllServices,
  handleGetServiceDetail,
  handleCreateService,
  handleUpdateService,
  handleDeleteService,
};
