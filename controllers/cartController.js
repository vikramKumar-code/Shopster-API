import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/productModel.js";


// Get Cart Controller

export const getCart = async (req, res) => {
  try {

    // Temporary buyer id
    const buyerId = req.user._id;

    const cart = await Cart.findOne({ buyer: buyerId })
      .populate("items.product","name price image category");

    if (!cart) {
      return res.status(200).json({
        status: "Success",
        message: "Cart is empty",
        data: [],
      });
    }

    res.status(200).json({
      status: "Success",
      message: "Cart fetched successfully",
      data: cart,
    });

  } catch (error) {

    res.status(500).json({
      status: "Fail",
      message: error.message,
    });

  }
};


// Add to Cart Controller

export const addToCart = async (req, res) => {

  try {

    const buyerId = req.user._id;

    const { productId, quantity } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        status: "Fail",
        message: "Product and quantity are required",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        status: "Fail",
        message: "Quantity must be greater than 0",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        status: "Fail",
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        status: "Fail",
        message: "Product not found",
      });
    }

    let cart = await Cart.findOne({ buyer: buyerId });

    if (!cart) {

      cart = await Cart.create({
        buyer: buyerId,
        items: [],
      });

    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
      });
    }

    await cart.save();

    await cart.populate("items.product");

    return res.status(200).json({
      status: "Success",
      message: "Product added successfully",
      data: cart,
    });

  } catch (error) {

    res.status(500).json({
      status: "Fail",
      message: error.message,
    });

  }

};



// Update Cart Quantity Controller

export const updateCartQuantity = async (req, res) => {
  try {

    const buyerId = req.user._id;

    const { productId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ buyer: buyerId });

    if (!cart) {
      return res.status(404).json({
        status: "Fail",
        message: "Cart not found",
      });
    }

    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        status: "Fail",
        message: "Product not found in cart",
      });
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
      );
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    await cart.populate("items.product", "name price image category");

    res.status(200).json({
      status: "Success",
      message: "Cart updated successfully",
      data: cart,
    });

  } catch (error) {

    res.status(500).json({
      status: "Fail",
      message: error.message,
    });

  }
};


// Remove Cart Item Controller

export const removeCartItem = async (req, res) => {

  try {

    const buyerId = req.user._id;

    const { productId } = req.params;

    const cart = await Cart.findOne({ buyer: buyerId });

    if (!cart) {
      return res.status(404).json({
        status: "Fail",
        message: "Cart not found",
      });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate("items.product", "name price image category");

    res.status(200).json({
      status: "Success",
      message: "Item removed successfully",
      data: cart,
    });

  } catch (error) {

    res.status(500).json({
      status: "Fail",
      message: error.message,
    });

  }

};



// Clear Cart Controller

export const clearCart = async (req, res) => {

  try {

    const buyerId = req.user._id;

    const cart = await Cart.findOne({ buyer: buyerId });

    if (!cart) {
      return res.status(404).json({
        status: "Fail",
        message: "Cart not found",
      });
    }

    cart.items = [];

    await cart.save();

    res.status(200).json({
      status: "Success",
      message: "Cart cleared successfully",
      data: cart,
    });

  } catch (error) {

    res.status(500).json({
      status: "Fail",
      message: error.message,
    });

  }

};