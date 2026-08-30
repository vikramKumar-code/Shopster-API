import express from "express";
import {
  createCheckoutSession,
  stripeWebhook,
} from "../controllers/paymentController.js";
import protectBuyer from "../middleware/buyerAuthMiddleware.js";

const router = express.Router();

router.post("/:orderId/checkout-session", protectBuyer, createCheckoutSession);

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

export default router;
