const express = require("express");
const companyRouter = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");
const { uploadImage, setUploadFolder } = require("../uploads/uploadImage");
const {
  createCompany,
  getAllCompanies,
  getCompanyDetail,
  updateCompany,
  deleteCompany,
  uploadCompanyLogo,
  uploadCompanySignature,
} = require("../controllers/companyController");

companyRouter.get("/getAllCompanies", jwtMiddleware, getAllCompanies);
companyRouter.get("/getCompanyDetail/:id", jwtMiddleware, getCompanyDetail);
companyRouter.post("/createCompany", jwtMiddleware, createCompany);
companyRouter.put("/updateCompany/:id", jwtMiddleware, updateCompany);
companyRouter.delete("/deleteCompany/:id", jwtMiddleware, deleteCompany);

companyRouter.post(
  "/uploadCompanyLogo/:id",
  jwtMiddleware,
  setUploadFolder("logos"),
  uploadImage.single("file"),
  uploadCompanyLogo
);
companyRouter.post(
  "/uploadCompanySignature/:id",
  jwtMiddleware,
  setUploadFolder("signatures"),
  uploadImage.single("file"),
  uploadCompanySignature
);

module.exports = companyRouter;
