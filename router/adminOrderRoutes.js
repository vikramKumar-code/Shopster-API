import { Router } from "express";

import {
  getAllOrders,
  getSingleOrder,
  updateOrderStatus,
} from "../controllers/adminOrderController.js";

import protect from "../middleware/authMiddleware.js";

const router = Router();

// Get all orders
router.get("/", protect, getAllOrders);

// Get single order
router.get("/:id", protect, getSingleOrder);

// Update order status
router.put("/:id/status", protect, updateOrderStatus);

export default router;