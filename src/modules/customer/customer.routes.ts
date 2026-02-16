import { Router } from "express";
import * as controller from "./customer.controller";
import encryptResponse from "../../common/middleware/encryptResponse";
import { upload } from "../../common/utils/upload";
import { protect } from "../../common/middleware/auth.middleware";

const router = Router();

// ======== IMPORTANT: Place specific routes before :id routes ========

// Public routes
router.post("/login", controller.loginCustomer);
router.post("/status/verifyToken", controller.verifyToken);
router.get("/gstr", controller.getGSTCustomers);

// Protected routes - require authentication
router.post("/create", protect, controller.createCustomer);
router.get("/", encryptResponse, protect, controller.getCustomers);
router.get("/gst-lookup", protect, controller.lookupCustomerByGST);
router.get("/export", protect, controller.exportCustomers);

// Bulk import with file upload and auth
router.post(
  "/import",
  protect,
  upload.single("file"),
  controller.importCustomers
);

// Credit and blacklist routes
router.post("/request-credit", protect, controller.requestCreditApproval);
router.post("/blacklist", protect, controller.blacklistCustomer);

// ======== ID-based routes (MUST be last) ========
router.put("/:id", protect, controller.updateCustomer);
router.delete("/:id", protect, controller.deleteCustomer);

export default router;
