import { Router } from "express";

import {
  issueRefund,
  listRefunds,
} from "../controllers/refundController.js";

import protect from "../middleware/authMiddleware.js";

const router = Router();

// Admin issue refund
router.post(
  "/:orderId",
  protect,
  issueRefund,
);

// Admin list refunds
router.get(
  "/",
  protect,
  listRefunds,
);

export default router;