import Razorpay from "razorpay";
import Order from "../models/Order.js";

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay credentials are not configured",
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};


// ==============================================
// POST /api/admin/refund/:orderId
// Admin issue partial/full refund
// ==============================================

export const issueRefund = async (req, res) => {
  try {
    const { orderId } = req.params;

    const {
      amount,
      reason,
    } = req.body;

    const refundAmount = Number(amount);

    // ------------------------------
    // Validate amount
    // ------------------------------

    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {
      return res.status(400).json({
        status: "Fail",
        message:
          "Refund amount must be greater than 0",
      });
    }

    // ------------------------------
    // Validate reason
    // ------------------------------

    if (
      !reason ||
      typeof reason !== "string" ||
      reason.trim() === ""
    ) {
      return res.status(400).json({
        status: "Fail",
        message: "Refund reason is required",
      });
    }

    // ------------------------------
    // Find order
    // ------------------------------

    const order = await Order.findById(orderId)
      .populate(
        "buyer",
        "username email phone",
      );

    if (!order) {
      return res.status(404).json({
        status: "Fail",
        message: "Order not found",
      });
    }

    // ------------------------------
    // Only paid order can be refunded
    // ------------------------------

    if (order.paymentStatus !== "Paid") {
      return res.status(400).json({
        status: "Fail",
        message:
          `Cannot refund. Order payment status is ${order.paymentStatus}`,
      });
    }

    // ------------------------------
    // COD cannot use Razorpay refund
    // ------------------------------

    if (order.paymentMethod !== "RAZORPAY") {
      return res.status(400).json({
        status: "Fail",
        message:
          "Only Razorpay payments can be refunded through this endpoint",
      });
    }

    // ------------------------------
    // Need actual Razorpay payment ID
    // ------------------------------

    if (!order.paymentId) {
      return res.status(400).json({
        status: "Fail",
        message:
          "Razorpay payment ID is missing for this order",
      });
    }

    // ------------------------------
    // Calculate remaining refundable
    // ------------------------------

    const alreadyRefunded =
      Number(order.refundAmount || 0);

    const maxRefundable =
      Number(order.totalAmount) -
      alreadyRefunded;

    if (maxRefundable <= 0) {
      return res.status(400).json({
        status: "Fail",
        message:
          "This order has already been fully refunded",
      });
    }

    if (refundAmount > maxRefundable) {
      return res.status(400).json({
        status: "Fail",
        message:
          `Maximum refundable amount is ₹${maxRefundable.toFixed(
            2,
          )}. Already refunded: ₹${alreadyRefunded.toFixed(
            2,
          )}`,
      });
    }

    // ------------------------------
    // Process through Razorpay
    // ------------------------------

    try {
      const razorpay =
        getRazorpayInstance();

      /*
       * IMPORTANT:
       *
       * order.paymentId must contain the Razorpay
       * payment ID such as:
       *
       * pay_XXXXXXXX
       *
       * paymentOrderId is normally:
       * order_XXXXXXXX
       */

      const refund =
        await razorpay.payments.refund(
          order.paymentId,
          {
            amount: Math.round(
              refundAmount * 100,
            ),

            notes: {
              orderId:
                order._id.toString(),

              reason: reason.trim(),
            },
          },
        );

      // ------------------------------
      // Update local order
      // ------------------------------

      const newTotalRefunded =
        alreadyRefunded +
        refundAmount;

      order.refundAmount =
        newTotalRefunded;

      order.refundId =
        refund.id;

      // Keep refund history
      order.refundHistory.push({
        refundId: refund.id,
        amount: refundAmount,
        reason: reason.trim(),
        status:
          refund.status || "Processed",
        refundedAt: new Date(),
      });

      // Full or partial refund?
      if (
        newTotalRefunded >=
        Number(order.totalAmount)
      ) {
        order.refundStatus = "Full";
        order.paymentStatus =
          "Refunded";
      } else {
        order.refundStatus =
          "Partial";
      }

      await order.save();

      return res.status(200).json({
        status: "Success",

        message:
          `Refund of ₹${refundAmount.toFixed(
            2,
          )} issued successfully`,

        data: {
          orderId: order._id,

          razorpayRefundId:
            refund.id,

          refundedNow:
            refundAmount,

          totalRefunded:
            order.refundAmount,

          remainingRefundable:
            Math.max(
              Number(
                order.totalAmount,
              ) -
                Number(
                  order.refundAmount,
                ),
              0,
            ),

          refundStatus:
            order.refundStatus,

          paymentStatus:
            order.paymentStatus,
        },
      });
    } catch (gatewayError) {
      console.error(
        "Razorpay refund error:",
        gatewayError?.error ||
          gatewayError?.message ||
          gatewayError,
      );

      return res.status(500).json({
        status: "Fail",
        message:
          "Failed to process refund through Razorpay",
      });
    }
  } catch (error) {
    console.error(
      "Issue refund error:",
      error,
    );

    return res.status(500).json({
      status: "Fail",
      message:
        "Internal server error",
    });
  }
};


// ==============================================
// GET /api/admin/refund
// List all refunded orders
// ==============================================

export const listRefunds = async (
  req,
  res,
) => {
  try {
    const refundedOrders =
      await Order.find({
        refundAmount: {
          $gt: 0,
        },
      })
        .populate(
          "buyer",
          "username email phone",
        )
        .sort({
          updatedAt: -1,
        });

    const data =
      refundedOrders.map(
        (order) => ({
          orderId: order._id,

          buyer: order.buyer,

          totalAmount:
            order.totalAmount,

          refundAmount:
            order.refundAmount,

          refundStatus:
            order.refundStatus,

          paymentStatus:
            order.paymentStatus,

          refundId:
            order.refundId,

          refundHistory:
            order.refundHistory,

          updatedAt:
            order.updatedAt,
        }),
      );

    return res.status(200).json({
      status: "Success",

      message:
        "Refunded orders retrieved successfully",

      count: data.length,

      data,
    });
  } catch (error) {
    console.error(
      "List refunds error:",
      error,
    );

    return res.status(500).json({
      status: "Fail",
      message:
        "Failed to retrieve refunds",
    });
  }
};