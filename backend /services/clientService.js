const Client = require("../models/clientModel");
const Document = require("../models/documentModel");
const User = require("../models/userModel");
const { recordAudit } = require("./auditLogService");

const fetchCreateClient = async (req, res) => {
  try {
    const client = await Client.create({
      ...req.body,
      createdBy: req.user.mongoId,
    });

    recordAudit({
      entityType: "client",
      entityId: client._id,
      action: "created",
      performedBy: req.user.mongoId,
      meta: { name: client.name },
    });

    return res.status(201).json({
      success: true,
      message: "Client created successfully",
      data: client.toObject(),
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Create Client:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchAllClients = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = String(req.query.isActive) === "true";
    }
    if (req.query.search) {
      const search = String(req.query.search).trim();
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Client.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Clients fetched successfully",
      total,
      page,
      limit,
      data: clients,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get All Clients:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchClientDetail = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).lean();
    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found", statusCode: 404 });
    }

    const documentCount = await Document.countDocuments({ client: client._id });

    return res.status(200).json({
      success: true,
      message: "Client fetched successfully",
      data: { ...client, documentCount },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Client Detail:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchUpdateClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found", statusCode: 404 });
    }

    Object.assign(client, req.body);
    await client.save();

    recordAudit({
      entityType: "client",
      entityId: client._id,
      action: "updated",
      performedBy: req.user.mongoId,
      meta: { fields: Object.keys(req.body) },
    });

    return res.status(200).json({
      success: true,
      message: "Client updated successfully",
      data: client.toObject(),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Update Client:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// A client referenced by any document is deactivated rather than removed.
const fetchDeleteClient = async (req, res) => {
  try {
    const user = await User.findById(req.user.mongoId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only an admin can delete a client",
        statusCode: 403,
      });
    }

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res
        .status(404)
        .json({ success: false, message: "Client not found", statusCode: 404 });
    }

    const referenceCount = await Document.countDocuments({ client: client._id });
    if (referenceCount > 0) {
      client.isActive = false;
      await client.save();

      recordAudit({
        entityType: "client",
        entityId: client._id,
        action: "deactivated",
        performedBy: req.user.mongoId,
        meta: { referenceCount },
      });

      return res.status(200).json({
        success: true,
        message: `Client is used by ${referenceCount} document(s), so it was deactivated instead of deleted`,
        data: { _id: client._id, isActive: false, softDeleted: true },
        statusCode: 200,
      });
    }

    await client.deleteOne();

    recordAudit({
      entityType: "client",
      entityId: client._id,
      action: "deleted",
      performedBy: req.user.mongoId,
      meta: { name: client.name },
    });

    return res.status(200).json({
      success: true,
      message: "Client deleted successfully",
      data: { _id: client._id, softDeleted: false },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Delete Client:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchCreateClient,
  fetchAllClients,
  fetchClientDetail,
  fetchUpdateClient,
  fetchDeleteClient,
};
