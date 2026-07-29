import Product from "../models/productModel.js";

export const getAllProducts = async (req, res) => {
  try {
    const getProducts = await Product.find({}).populate("userId", "-password");

    return res.status(200).json({
      status: "Success",
      message: "Products Fetched Successfully",
      data: getProducts,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed To Fetch Products: ${error.message}`,
    });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { name, description, category, price } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "Fail",
        message: "Unauthorized",
      });
    }

    if (!name || !description || !category || !price) {
      return res.status(400).json({
        status: "Fail",
        message: "All Fields Are Required",
      });
    }

    const existingProduct = await Product.findOne({ name });

    if (existingProduct) {
      return res.status(409).json({
        status: "Fail",
        message: "Product Already Exists",
      });
    }

    const newProduct = await Product.create({
      name,
      description,
      category,
      price,
      userId,
    });

    return res.status(201).json({
      status: "Success",
      message: "Product Added Successfully",
      data: newProduct,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to Add Product: ${error.message}`,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price } = req.body;
    const product = await Product.findOne({ _id: id });

    if (!product) {
      return res.status(404).json({
        status: "Fail",
        message: "Product Not Found",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        name,
        description,
        category,
        price,
      },
      { new: true, runValidators: true },
    );

    return res.status(200).json({
      status: "Success",
      message: "Product Updated Successfully",
      data: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to Update Product: ${error.message}`,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        status: "Fail",
        message: "Product Not Found",
      });
    }

    return res.status(200).json({
      status: "Success",
      message: "Product Deleted Successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "Fail",
      message: `Failed to delete product: ${error.message}`,
    });
  }
};
