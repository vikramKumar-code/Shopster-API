import "dotenv/config";
import express from "express";
import connectDB from "./config/db.js";
import productRoutes from "./router/productRoutes.js";
import authRoutes from "./router/authRoutes.js";
import cors from "cors";
import morgan from "morgan";
import cartRoutes from "./router/cartRoutes.js";
import buyerRoutes from "./router/buyerRoutes.js";
import orderRoutes from "./router/orderRoutes.js";
import adminOrderRoutes from "./router/adminOrderRoutes.js";
import paymentRoutes from "./router/paymentRoutes.js";

const app = express();

const PORT = process.env.PORT || 3000;

app.use("/api/payment", paymentRoutes);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.use("/api/product", productRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/buyer", buyerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/admin/orders", adminOrderRoutes);

const startServer = async () => {
  await connectDB();
  await app.listen(PORT);
  console.log(`Server Running On Port: ${PORT}`);
};

startServer();
