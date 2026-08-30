// Boot backend on in-memory Mongo, seeded with a demo admin, buyer, product,
// and one already-"paid" Stripe order so the invoice + refund UI can be tried
// without live Stripe keys. For local end-to-end testing only.
import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 } });
process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET = "dev_admin_secret";
process.env.JWT_BUYER = "dev_buyer_secret";
process.env.PORT = process.env.PORT || "3000";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

console.log("Ephemeral dev MongoDB:", mongod.getUri());
await import("../server.js");
await new Promise((r) => setTimeout(r, 1200));

const BASE = "http://localhost:" + process.env.PORT + "/api";
const j = (b) => JSON.stringify(b);
const call = async (p, o = {}) => {
  const res = await fetch(BASE + p, { ...o, headers: { "Content-Type": "application/json", ...(o.headers || {}) } });
  let body = {}; try { body = await res.json(); } catch { /* ignore */ }
  return { status: res.status, body };
};

const admin = await call("/auth/register", { method: "POST", body: j({ username: "admin", email: "admin@shopster.dev", password: "pass1234" }) });
const adminToken = admin.body.token;
const buyer = await call("/buyer/register", { method: "POST", body: j({ username: "demo", email: "demo@shopster.dev", password: "pass1234", phone: "9990001111", address: "1 Demo Lane" }) });
const buyerToken = buyer.body.token;

const auth = (t) => ({ Authorization: "Bearer " + t });
const p1 = await call("/product", { method: "POST", headers: auth(adminToken), body: j({ name: "Mechanical Keyboard", description: "Clicky", category: "Electronics", price: 2499 }) });
const p2 = await call("/product", { method: "POST", headers: auth(adminToken), body: j({ name: "USB-C Cable", description: "1m", category: "Electronics", price: 299 }) });

// A delivered, paid Stripe order so invoice download + refund can be exercised in the UI
const Order = (await import("../models/Order.js")).default;
await Order.create({
  buyer: buyer.body.data._id,
  items: [{ product: p1.body.data._id, name: "Mechanical Keyboard", price: 2499, quantity: 1 }],
  totalAmount: 2499,
  shippingAddress: "1 Demo Lane, , Metropolis, 111111",
  paymentMethod: "stripe",
  paymentStatus: "paid",
  isPaid: true,
  paidAt: new Date(),
  paymentIntentId: "pi_demo_seeded",
  status: "Delivered",
});

console.log("\nSeeded. Admin: admin@shopster.dev / pass1234   Buyer: demo@shopster.dev / pass1234");
console.log("Backend on " + BASE + "\n");
