import Order from "../models/Order.js";

const allowedStatuses = [
  "Pending",
  "Confirmed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

// GET /api/admin/orders
// Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    // Optional status filter
    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          status: "Fail",
          message: "Invalid order status",
        });
      }

      filter.status = status;
    }

    const orders = await Order.find(filter)
      .populate("buyer", "username email")
      .populate("items.product")
      .sort({ createdAt: -1 });

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

// GET /api/admin/orders/:id
// Get single order
export const getSingleOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("buyer", "username email")
      .populate("items.product");

    if (!order) {
      return res.status(404).json({
        status: "Fail",
        message: "Order not found",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Order fetched successfully",
      data: order,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to fetch order: ${error.message}`,
    });
  }
};

// PUT /api/admin/orders/:id/status
// Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check status is valid
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "Fail",
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        status: "Fail",
        message: "Order not found",
      });
    }

    // Delivered order cannot be cancelled or changed
    if (order.status === "Delivered") {
      return res.status(400).json({
        status: "Fail",
        message: "Delivered order status cannot be changed",
      });
    }

    // Cancelled order cannot be changed again
    if (order.status === "Cancelled") {
      return res.status(400).json({
        status: "Fail",
        message: "Cancelled order status cannot be changed",
      });
    }

    // Status order
    const statusOrder = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
    ];

    // Cancel is allowed from any status except Delivered
    if (status !== "Cancelled") {
      const currentIndex = statusOrder.indexOf(order.status);
      const newIndex = statusOrder.indexOf(status);

      // Don't allow moving backwards
      if (newIndex < currentIndex) {
        return res.status(400).json({
          status: "Fail",
          message: `Order cannot move from ${order.status} to ${status}`,
        });
      }
    }

    order.status = status;

    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate("buyer", "username email")
      .populate("items.product");

    return res.status(200).json({
      status: "Success",
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to update order status: ${error.message}`,
    });
  }
};