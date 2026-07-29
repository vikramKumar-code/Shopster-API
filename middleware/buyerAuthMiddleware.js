import jwt from "jsonwebtoken";
import Buyer from "../models/buyerModel.js";

const protectBuyer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "Fail",
        message: "Token Not Provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_BUYER);
    if (!decoded) {
      return res.status(401).json({
        status: "Fail",
        message: "Unauthorized",
      });
    }

    const buyer = await Buyer.findById(decoded.id).select("-password");
    if (!buyer) {
      return res.status(404).json({
        status: "Fail",
        message: "Buyer Not Found",
      });
    }

    req.user = buyer;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "Fail",
      message: `Failed to Authenticate Token: ${error.message}`,
    });
  }
};

export default protectBuyer;
