import { Router } from "express";

import {
  placeOrder,
  orderHistory,
  orderHistoryById,
  downloadInvoice,
} from "../controllers/orderController.js";

import protectBuyer from "../middleware/buyerAuthMiddleware.js";

const router = Router();

router.post(
  "/place-order",
  protectBuyer,
  placeOrder,
);

router.get(
  "/order-history",
  protectBuyer,
  orderHistory,
);

router.get(
  "/order-history/:id",
  protectBuyer,
  orderHistoryById,
);

// Developer B - Invoice download
router.get(
  "/:orderId/invoice",
  protectBuyer,
  downloadInvoice,
);

export default router;