const Service = require("../models/serviceModel");
const Document = require("../models/documentModel");
const User = require("../models/userModel");
const { recordAudit } = require("./auditLogService");

const fetchCreateService = async (req, res) => {
  try {
    const service = await Service.create({
      ...req.body,
      createdBy: req.user.mongoId,
    });

    recordAudit({
      entityType: "service",
      entityId: service._id,
      action: "created",
      performedBy: req.user.mongoId,
      meta: { name: service.name },
    });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: service.toObject(),
      statusCode: 201,
    });
  } catch (error) {
    console.error("Error Create Service:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchAllServices = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;

    const query = {};
    if (req.query.isActive !== undefined) {
      query.isActive = String(req.query.isActive) === "true";
    }
    if (req.query.search) {
      const search = String(req.query.search).trim();
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const services = await Service.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Service.countDocuments(query);

    return res.status(200).json({
      success: true,
      message: "Services fetched successfully",
      total,
      page,
      limit,
      data: services,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get All Services:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchServiceDetail = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).lean();
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found", statusCode: 404 });
    }

    return res.status(200).json({
      success: true,
      message: "Service fetched successfully",
      data: service,
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Get Service Detail:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

const fetchUpdateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found", statusCode: 404 });
    }

    Object.assign(service, req.body);
    await service.save();

    recordAudit({
      entityType: "service",
      entityId: service._id,
      action: "updated",
      performedBy: req.user.mongoId,
      meta: { fields: Object.keys(req.body) },
    });

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      data: service.toObject(),
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Update Service:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

// A catalog entry referenced by a document line is deactivated, not removed.
const fetchDeleteService = async (req, res) => {
  try {
    const user = await User.findById(req.user.mongoId).select("role");
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only an admin can delete a service",
        statusCode: 403,
      });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res
        .status(404)
        .json({ success: false, message: "Service not found", statusCode: 404 });
    }

    const referenceCount = await Document.countDocuments({
      "items.serviceRef": service._id,
    });
    if (referenceCount > 0) {
      service.isActive = false;
      await service.save();

      recordAudit({
        entityType: "service",
        entityId: service._id,
        action: "deactivated",
        performedBy: req.user.mongoId,
        meta: { referenceCount },
      });

      return res.status(200).json({
        success: true,
        message: `Service is used by ${referenceCount} document(s), so it was deactivated instead of deleted`,
        data: { _id: service._id, isActive: false, softDeleted: true },
        statusCode: 200,
      });
    }

    await service.deleteOne();

    recordAudit({
      entityType: "service",
      entityId: service._id,
      action: "deleted",
      performedBy: req.user.mongoId,
      meta: { name: service.name },
    });

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
      data: { _id: service._id, softDeleted: false },
      statusCode: 200,
    });
  } catch (error) {
    console.error("Error Delete Service:", error.message);
    return res
      .status(500)
      .json({ success: false, message: error.message, statusCode: 500 });
  }
};

module.exports = {
  fetchCreateService,
  fetchAllServices,
  fetchServiceDetail,
  fetchUpdateService,
  fetchDeleteService,
};
