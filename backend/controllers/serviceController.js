const {
  createServiceSchema,
  updateServiceSchema,
} = require("../validators/serviceValidators");
const {
  fetchCreateService,
  fetchAllServices,
  fetchServiceDetail,
  fetchUpdateService,
  fetchDeleteService,
} = require("../services/serviceService");

const createService = async (req, res) => {
  try {
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchCreateService(req, res);
  } catch (error) {
    console.error("Error Create Service:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getAllServices = async (req, res) => {
  try {
    await fetchAllServices(req, res);
  } catch (error) {
    console.error("Error Get All Services:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const getServiceDetail = async (req, res) => {
  try {
    await fetchServiceDetail(req, res);
  } catch (error) {
    console.error("Error Get Service Detail:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const updateService = async (req, res) => {
  try {
    const { error, value } = updateServiceSchema.validate(req.body);
    if (error) return res.status(422).json({ message: error.details[0].message });
    req.body = value;
    await fetchUpdateService(req, res);
  } catch (error) {
    console.error("Error Update Service:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

const deleteService = async (req, res) => {
  try {
    await fetchDeleteService(req, res);
  } catch (error) {
    console.error("Error Delete Service:", error);
    return res.status(500).json({ message: error.message, statusCode: 500 });
  }
};

module.exports = {
  createService,
  getAllServices,
  getServiceDetail,
  updateService,
  deleteService,
};
