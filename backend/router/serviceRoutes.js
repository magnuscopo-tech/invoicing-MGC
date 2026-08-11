const express = require("express");
const serviceRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const {
  createService,
  getAllServices,
  getServiceDetail,
  updateService,
  deleteService,
} = require("../controllers/serviceController");

serviceRouter.get("/getAllServices", jwtMiddleware, getAllServices);
serviceRouter.get("/getServiceDetail/:id", jwtMiddleware, getServiceDetail);
serviceRouter.post("/createService", jwtMiddleware, createService);
serviceRouter.put("/updateService/:id", jwtMiddleware, updateService);
serviceRouter.delete("/deleteService/:id", jwtMiddleware, deleteService);

module.exports = serviceRouter;
