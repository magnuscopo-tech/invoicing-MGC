const express = require("express");
const clientRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const {
  createClient,
  getAllClients,
  getClientDetail,
  updateClient,
  deleteClient,
} = require("../controllers/clientController");

clientRouter.get("/getAllClients", jwtMiddleware, getAllClients);
clientRouter.get("/getClientDetail/:id", jwtMiddleware, getClientDetail);
clientRouter.post("/createClient", jwtMiddleware, createClient);
clientRouter.put("/updateClient/:id", jwtMiddleware, updateClient);
clientRouter.delete("/deleteClient/:id", jwtMiddleware, deleteClient);

module.exports = clientRouter;
