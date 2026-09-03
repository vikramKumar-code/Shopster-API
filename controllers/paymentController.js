import stripe from "../config/stripe.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ _id: orderId, buyer: req.user._id });

    if (!order) {
      return res.status(404).json({
        status: "Fail",
        message: "Order not found",
      });
    }

    if (order.paymentMethod !== "stripe") {
      return res.status(400).json({
        status: "Fail",
        message: "This order is not configured for Stripe payment",
      });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        status: "Fail",
        message: "Order is already paid",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: req.user.email,
      line_items: order.items.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      metadata: {
        orderId: order._id.toString(),
        buyerId: req.user._id.toString(),
      },
      success_url: `${process.env.CLIENT_URL}/order-success/${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout`,
    });

    order.stripeSessionId = session.id;
    order.paymentStatus = "pending";
    await order.save();

    return res.status(200).json({
      status: "Success",
      message: "Checkout session created",
      data: {
        orderId: order._id,
        sessionId: session.id,
        checkoutUrl: session.url,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to create checkout session: ${error.message}`,
    });
  }
};

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).json({
      status: "fail",
      message: `Webhook signature verification failed: ${err.message}`,
    });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { orderId, buyerId } = session.metadata;

    try {
      const order = await Order.findById(orderId);
      // Idempotent: ignore duplicate webhooks for an already-paid order
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        order.isPaid = true;
        order.paidAt = new Date();
        // Keep the PaymentIntent id so refunds can be issued later
        if (session.payment_intent) {
          order.paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent.id;
        }
        await order.save();

        await Cart.findOneAndUpdate({ buyer: buyerId }, { items: [] });
      }
    } catch (err) {
      console.error("Error updating order after payment:", err);
    }
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const { orderId } = session.metadata;
    try {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "failed" });
    } catch (err) {
      console.error("Error updating order after expiration:", err);
    }
  }

  res.status(200).json({ received: true });
};
