import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Buyer",
      required: true,
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    shippingAddress: {
      type: String,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "stripe"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    // Stripe references
    stripeSessionId: { type: String, default: null },
    // Stripe PaymentIntent id (pi_xxx) captured from the webhook; needed for refunds
    paymentIntentId: { type: String, default: null },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },

    // ---- Refunds ----
    // Last Stripe refund id (re_xxx)
    refundId: { type: String, default: null },

    // Total amount refunded so far
    refundAmount: { type: Number, default: 0, min: 0 },

    refundStatus: {
      type: String,
      enum: ["not_refunded", "partial", "full", "failed"],
      default: "not_refunded",
    },

    // History of every partial/full refund
    refundHistory: [
      {
        refundId: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        reason: { type: String, default: "" },
        status: { type: String, default: "processed" },
        refundedAt: { type: Date, default: Date.now },
      },
    ],

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true },
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ stripeSessionId: 1 });

export default mongoose.model("Order", orderSchema);