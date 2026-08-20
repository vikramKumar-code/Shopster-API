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
      enum: ["COD", "RAZORPAY"],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    // Razorpay payment ID: pay_xxxxx
    paymentId: {
      type: String,
      default: null,
    },

    // Razorpay order ID: order_xxxxx
    paymentOrderId: {
      type: String,
      default: null,
    },

    // Last Razorpay refund ID
    refundId: {
      type: String,
      default: null,
    },

    // Total amount refunded so far
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundStatus: {
      type: String,
      enum: [
        "Not_Refunded",
        "Requested",
        "Partial",
        "Full",
        "Refunded",
        "Failed",
      ],
      default: "Not_Refunded",
    },

    // Keep history of every partial/full refund
    refundHistory: [
      {
        refundId: {
          type: String,
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        reason: {
          type: String,
          default: "",
        },
        status: {
          type: String,
          default: "Processed",
        },
        refundedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    paidAt: {
      type: Date,
      default: null,
    },

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
orderSchema.index({ paymentId: 1 });

export default mongoose.model("Order", orderSchema);