import stripe from "../config/stripe.js";
import Order from "../models/Order.js";

// ==============================================
// POST /api/admin/refund/:orderId
// Admin issue partial/full refund (Stripe)
// ==============================================

export const issueRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;

    const refundAmount = Number(amount);

    // Validate amount
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      return res.status(400).json({
        status: "Fail",
        message: "Refund amount must be greater than 0",
      });
    }

    // Validate reason
    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return res.status(400).json({
        status: "Fail",
        message: "Refund reason is required",
      });
    }

    // Find order
    const order = await Order.findById(orderId).populate(
      "buyer",
      "username email phone",
    );

    if (!order) {
      return res.status(404).json({
        status: "Fail",
        message: "Order not found",
      });
    }

    // Only a paid order can be refunded
    if (order.paymentStatus !== "paid") {
      return res.status(400).json({
        status: "Fail",
        message: `Cannot refund. Order payment status is ${order.paymentStatus}`,
      });
    }

    // Only Stripe payments are refundable through this endpoint (COD is not)
    if (order.paymentMethod !== "stripe") {
      return res.status(400).json({
        status: "Fail",
        message: "Only Stripe payments can be refunded through this endpoint",
      });
    }

    // Need the Stripe PaymentIntent id captured by the webhook
    if (!order.paymentIntentId) {
      return res.status(400).json({
        status: "Fail",
        message: "Stripe payment reference is missing for this order",
      });
    }

    // Calculate remaining refundable amount
    const alreadyRefunded = Number(order.refundAmount || 0);
    const maxRefundable = Number(order.totalAmount) - alreadyRefunded;

    if (maxRefundable <= 0) {
      return res.status(400).json({
        status: "Fail",
        message: "This order has already been fully refunded",
      });
    }

    if (refundAmount > maxRefundable) {
      return res.status(400).json({
        status: "Fail",
        message:
          `Maximum refundable amount is ₹${maxRefundable.toFixed(2)}. ` +
          `Already refunded: ₹${alreadyRefunded.toFixed(2)}`,
      });
    }

    // Process the refund through Stripe
    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.paymentIntentId,
        amount: Math.round(refundAmount * 100),
        reason: "requested_by_customer",
        metadata: {
          orderId: order._id.toString(),
          reason: reason.trim(),
        },
      });

      // Update local order
      const newTotalRefunded = alreadyRefunded + refundAmount;

      order.refundAmount = newTotalRefunded;
      order.refundId = refund.id;

      order.refundHistory.push({
        refundId: refund.id,
        amount: refundAmount,
        reason: reason.trim(),
        status: refund.status || "processed",
        refundedAt: new Date(),
      });

      // Full or partial refund?
      if (newTotalRefunded >= Number(order.totalAmount)) {
        order.refundStatus = "full";
        order.paymentStatus = "refunded";
      } else {
        order.refundStatus = "partial";
      }

      await order.save();

      return res.status(200).json({
        status: "Success",
        message: `Refund of ₹${refundAmount.toFixed(2)} issued successfully`,
        data: {
          orderId: order._id,
          stripeRefundId: refund.id,
          refundedNow: refundAmount,
          totalRefunded: order.refundAmount,
          remainingRefundable: Math.max(
            Number(order.totalAmount) - Number(order.refundAmount),
            0,
          ),
          refundStatus: order.refundStatus,
          paymentStatus: order.paymentStatus,
        },
      });
    } catch (gatewayError) {
      console.error(
        "Stripe refund error:",
        gatewayError?.raw?.message || gatewayError?.message || gatewayError,
      );

      return res.status(502).json({
        status: "Fail",
        message: "Failed to process refund through Stripe",
      });
    }
  } catch (error) {
    console.error("Issue refund error:", error);

    return res.status(500).json({
      status: "Fail",
      message: "Internal server error",
    });
  }
};

// ==============================================
// GET /api/admin/refund
// List all refunded orders
// ==============================================

export const listRefunds = async (req, res) => {
  try {
    const refundedOrders = await Order.find({ refundAmount: { $gt: 0 } })
      .populate("buyer", "username email phone")
      .sort({ updatedAt: -1 });

    const data = refundedOrders.map((order) => ({
      orderId: order._id,
      buyer: order.buyer,
      totalAmount: order.totalAmount,
      refundAmount: order.refundAmount,
      refundStatus: order.refundStatus,
      paymentStatus: order.paymentStatus,
      refundId: order.refundId,
      refundHistory: order.refundHistory,
      updatedAt: order.updatedAt,
    }));

    return res.status(200).json({
      status: "Success",
      message: "Refunded orders retrieved successfully",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("List refunds error:", error);

    return res.status(500).json({
      status: "Fail",
      message: "Failed to retrieve refunds",
    });
  }
};
