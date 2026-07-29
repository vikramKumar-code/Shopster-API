import { Router } from "express";
import {
  buyerLogin,
  buyerRegister,
  deleteBuyer,
  getProfile,
  updateBuyer,
} from "../controllers/buyerController.js";
import protectBuyer from "../middleware/buyerAuthMiddleware.js";

const router = Router();

router.post("/register", buyerRegister);
router.post("/login", buyerLogin);

router.get("/profile", protectBuyer, getProfile);
router.put("/profile", protectBuyer, updateBuyer);
router.delete("/profile", protectBuyer, deleteBuyer);

export default router;
