const {
  createClientSchema,
  updateClientSchema,
} = require("../validators/clientValidators");
const {
  fetchCreateClient,
  fetchAllClients,
  fetchClientDetail,
  fetchUpdateClient,
  fetchDeleteClient,
} = require("../services/clientService");

const createClient = async (req, res) => {
  try {
    const { error, value } = createClientSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchCreateClient(req, res);
  } catch (error) {
    console.error("Error Create Client:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getAllClients = async (req, res) => {
  try {
    await fetchAllClients(req, res);
  } catch (error) {
    console.error("Error Get All Clients:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getClientDetail = async (req, res) => {
  try {
    await fetchClientDetail(req, res);
  } catch (error) {
    console.error("Error Get Client Detail:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const updateClient = async (req, res) => {
  try {
    const { error, value } = updateClientSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchUpdateClient(req, res);
  } catch (error) {
    console.error("Error Update Client:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const deleteClient = async (req, res) => {
  try {
    await fetchDeleteClient(req, res);
  } catch (error) {
    console.error("Error Delete Client:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  createClient,
  getAllClients,
  getClientDetail,
  updateClient,
  deleteClient,
};
