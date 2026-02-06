import { Router } from "express";
import * as controller from "./customer.controller";
import encryptResponse from "../../common/middleware/encryptResponse";
import { upload } from "../../common/utils/upload";
import { protect } from "../../common/middleware/auth.middleware";



const router = Router();

router.post("/create", protect,controller.createCustomer);
router.post("/login", controller.loginCustomer);
router.post("/status/verifyToken", controller.verifyToken);

router.get("/gstr", controller.getGSTCustomers);
router.get("/", encryptResponse, protect,controller.getCustomers);

router.put("/:id", controller.updateCustomer);
router.delete("/:id", controller.deleteCustomer);

router.post(
  "/import",
  upload.single("file"),
  controller.importCustomers
);

router.get("/export", controller.exportCustomers);
router.post("/request-credit", controller.requestCreditApproval);
router.post("/blacklist", controller.blacklistCustomer);


export default router;
