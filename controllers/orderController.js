import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import {generatePDFInvoice} from "../utils/invoiceGenerator.js"; 
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

export const downloadInvoice = async (
  req,
  res,
) => {
  try {
    const { orderId } =
      req.params;

    const buyerId =
      req.user._id;

    // Find order
    const order =
      await Order.findById(
        orderId,
      )
        .populate(
          "buyer",
          "username name email phone address",
        )
        .populate(
          "items.product",
        );

    // Order doesn't exist
    if (!order) {
      return res
        .status(404)
        .json({
          status: "Fail",
          message:
            "Order not found",
        });
    }

    // --------------------------------
    // Buyer ownership check
    // --------------------------------

    if (
      !order.buyer ||
      order.buyer._id.toString() !==
        buyerId.toString()
    ) {
      return res
        .status(404)
        .json({
          status: "Fail",
          message:
            "Order not found",
        });
    }

    // --------------------------------
    // Invoice only for paid order
    // --------------------------------

    if (
      order.paymentStatus !==
      "Paid"
    ) {
      return res
        .status(400)
        .json({
          status: "Fail",
          message:
            "Invoice is only available for paid orders",
        });
    }

    // --------------------------------
    // Generate PDF
    // --------------------------------

    const pdfBuffer =
      await generatePDFInvoice(
        order,
      );

    const invoiceNumber =
      order._id
        .toString()
        .slice(-8)
        .toUpperCase();

    // --------------------------------
    // Response headers
    // --------------------------------

    res.setHeader(
      "Content-Type",
      "application/pdf",
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice_${invoiceNumber}.pdf"`,
    );

    res.setHeader(
      "Content-Length",
      pdfBuffer.length,
    );

    return res
      .status(200)
      .send(pdfBuffer);
  } catch (error) {
    console.error(
      "Invoice download error:",
      error,
    );

    return res
      .status(500)
      .json({
        status: "Fail",
        message:
          "Failed to generate invoice",
      });
  }
};
