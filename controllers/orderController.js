import Order from "../models/Order.js";
import Cart from "../models/Cart.js";

export const placeOrder = async (req, res) => {
  try {
    const buyerId = req.user._id;
    const { shippingAddress, paymentMethod } = req.body;

    const cart = await Cart.findOne({ buyer: buyerId }).populate(
      "items.product",
      "name price",
    );

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({
        status: "Fail",
        message: "Cart is Empty",
      });
    }

    const orderItems = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const totalAmount = orderItems.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const order = await Order.create({
      buyer: buyerId,
      items: orderItems,
      totalAmount: totalAmount,
      shippingAddress,
      paymentMethod,
    });

    cart.items = [];
    await cart.save();

    return res.status(201).json({
      status: "Success",
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to place order: ${error.message}`,
    });
  }
};

export const orderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ buyer: req.user._id }).sort({
      createdAt: -1,
    });
    return res.status(200).json({
      status: "Success",
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to fetch orders: ${error.message}`,
    });
  }
};

export const orderHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    if (!order || order.buyer.toString() !== req.user._id.toString())
      return res.status(404).json({
        status: "Fail",
        message: "Order not found",
      });

    return res.status(200).json({
      status: "Success",
      message: "Order fetch Successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to fetch order: ${error.message}`,
    });
  }
};
