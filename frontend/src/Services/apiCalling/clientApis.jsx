import {
  GetAllClientsApi,
  GetClientDetailApi,
  CreateClientApi,
  UpdateClientApi,
  DeleteClientApi,
} from "../apiMethod";
import { itemsOf } from "../../Utlis/Common/commonMethod";

const handleGetAllClients = async (params = { page: 1, limit: 20 }) => {
  try {
    const response = await GetAllClientsApi(params);
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
    console.error("Error fetching clients:", error);
    return null;
  }
};

const handleGetClientDetail = async (id) => {
  try {
    const response = await GetClientDetailApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching client detail:", error);
    return null;
  }
};

const handleCreateClient = async (params) => {
  try {
    const response = await CreateClientApi(params);
    if (response.statusCode === 200 || response.statusCode === 201) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error creating client:", error);
    return null;
  }
};

const handleUpdateClient = async (id, params) => {
  try {
    const response = await UpdateClientApi(id, params);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error updating client:", error);
    return null;
  }
};

const handleDeleteClient = async (id) => {
  try {
    const response = await DeleteClientApi(id);
    if (response.statusCode === 200) {
      return response.raw.data;
    }
    return null;
  } catch (error) {
    console.error("Error deleting client:", error);
    return null;
  }
};

export {
  handleGetAllClients,
  handleGetClientDetail,
  handleCreateClient,
  handleUpdateClient,
  handleDeleteClient,
};
