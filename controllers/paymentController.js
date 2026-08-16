import stripe from "../config/stripe.js";
import Cart from "../models/Cart.js";
import Order from "../models/Order.js";

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
      if (order && order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        order.isPaid = true;
        order.paidAt = new Date();
        await order.save();

        await Cart.findByIdAndUpdate({ buyer: buyerId }, { items: [] });
      }
    } catch (err) {
      console.error("Error updating order after payment:", err);
    }
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const { orderId } = session.metadata;
    try {
      await Order.findByIdAndUpdate(orderId, { paymentStatus: "Failed" });
    } catch (err) {
      console.error("Error updating order after expiration:", err);
    }
  }

  res.status(200).json({ received: true });
};
