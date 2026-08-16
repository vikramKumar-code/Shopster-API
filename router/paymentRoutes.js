import express from "express";
import { stripeWebhook } from "../controllers/paymentController.js";

const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

export default router;
