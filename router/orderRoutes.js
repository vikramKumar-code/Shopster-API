import { Router } from "express";
import {
  placeOrder,
  orderHistory,
  orderHistoryById,
} from "../controllers/orderController.js";
import protectBuyer from "../middleware/buyerAuthMiddleware.js";

const router = Router();

router.post("/place-order", protectBuyer, placeOrder);
router.get("/order-history", protectBuyer, orderHistory);
router.get("/order-history/:id", protectBuyer, orderHistoryById);

export default router;
