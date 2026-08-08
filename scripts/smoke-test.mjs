import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET = "test_admin_secret";
process.env.JWT_BUYER = "test_buyer_secret";
process.env.PORT = "5055";

await import("../server.js");
await new Promise((r) => setTimeout(r, 1500));

const BASE = "http://localhost:5055/api";
let passed = 0;
let failed = 0;

const check = (label, cond, extra = "") => {
  if (cond) {
    console.log(`PASS - ${label}`);
    passed++;
  } else {
    console.log(`FAIL - ${label} ${extra}`);
    failed++;
  }
};

const call = async (path, opts = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body };
};

// 1. Admin register + login
const adminReg = await call("/auth/register", {
  method: "POST",
  body: JSON.stringify({ username: "admin1", email: "admin1@test.com", password: "pass1234" }),
});
check("admin register", adminReg.status === 201 && adminReg.body.token, JSON.stringify(adminReg.body));
const adminToken = adminReg.body.token;

// 2. Admin creates a product
const productRes = await call("/product", {
  method: "POST",
  headers: { Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ name: "Test Widget", description: "A widget", category: "Electronics", price: 100 }),
});
check("admin create product", productRes.status === 201, JSON.stringify(productRes.body));
const productId = productRes.body.data?._id;

// 3. Buyer A + Buyer B register
const buyerAReg = await call("/buyer/register", {
  method: "POST",
  body: JSON.stringify({
    username: "buyerA",
    email: "buyerA@test.com",
    password: "pass1234",
    phone: "9999999999",
    address: "123 Buyer St",
  }),
});
check("buyerA register", buyerAReg.status === 201 && buyerAReg.body.token, JSON.stringify(buyerAReg.body));
const buyerAToken = buyerAReg.body.token;

const buyerBReg = await call("/buyer/register", {
  method: "POST",
  body: JSON.stringify({
    username: "buyerB",
    email: "buyerB@test.com",
    password: "pass1234",
    phone: "8888888888",
    address: "456 Other St",
  }),
});
check("buyerB register", buyerBReg.status === 201 && buyerBReg.body.token, JSON.stringify(buyerBReg.body));
const buyerBToken = buyerBReg.body.token;

// 4. Buyer B tries to checkout with an empty cart -> should fail clearly
const emptyCheckout = await call("/order/place-order", {
  method: "POST",
  headers: { Authorization: `Bearer ${buyerBToken}` },
  body: JSON.stringify({ shippingAddress: "456 Other St", paymentMethod: "COD" }),
});
check("checkout blocked on empty cart", emptyCheckout.status === 404, JSON.stringify(emptyCheckout.body));

// 5. Buyer A adds product to cart
const addCart = await call("/cart", {
  method: "POST",
  headers: { Authorization: `Bearer ${buyerAToken}` },
  body: JSON.stringify({ productId, quantity: 2 }),
});
check("buyerA add to cart", addCart.status === 200 || addCart.status === 201, JSON.stringify(addCart.body));

// 6. Buyer A checks out
const checkout = await call("/order/place-order", {
  method: "POST",
  headers: { Authorization: `Bearer ${buyerAToken}` },
  body: JSON.stringify({ shippingAddress: "123 Buyer St", paymentMethod: "COD" }),
});
check(
  "buyerA checkout succeeds",
  checkout.status === 201 && checkout.body.data && checkout.body.data._id && checkout.body.data.totalAmount === 200,
  JSON.stringify(checkout.body)
);
const orderId = checkout.body.data?._id;

// 7. Cart is now empty
const cartAfter = await call("/cart", { headers: { Authorization: `Bearer ${buyerAToken}` } });
check(
  "cart cleared after checkout",
  cartAfter.status === 200 && (cartAfter.body.data?.items?.length ?? 0) === 0,
  JSON.stringify(cartAfter.body)
);

// 8. Buyer A order history, most recent first
const history = await call("/order/order-history", { headers: { Authorization: `Bearer ${buyerAToken}` } });
check(
  "buyerA order history contains the order",
  history.status === 200 && history.body.data?.length === 1 && history.body.data[0]._id === orderId,
  JSON.stringify(history.body)
);

// 9. Buyer A can view their own order detail
const ownDetail = await call(`/order/order-history/${orderId}`, {
  headers: { Authorization: `Bearer ${buyerAToken}` },
});
check("buyerA can view own order detail", ownDetail.status === 200, JSON.stringify(ownDetail.body));

// 10. Buyer B CANNOT view buyer A's order (IDOR check)
const idorAttempt = await call(`/order/order-history/${orderId}`, {
  headers: { Authorization: `Bearer ${buyerBToken}` },
});
check("buyerB blocked from buyerA's order (IDOR)", idorAttempt.status === 404, JSON.stringify(idorAttempt.body));

// 11. Admin lists all orders, buyer populated
const adminList = await call("/admin/orders", { headers: { Authorization: `Bearer ${adminToken}` } });
check(
  "admin list orders, buyer populated",
  adminList.status === 200 &&
    adminList.body.data?.length === 1 &&
    adminList.body.data[0].buyer?.username === "buyerA" &&
    adminList.body.data[0].items?.[0]?.product?.name === "Test Widget",
  JSON.stringify(adminList.body)
);

// 12. Admin views single order
const adminSingle = await call(`/admin/orders/${orderId}`, { headers: { Authorization: `Bearer ${adminToken}` } });
check("admin view single order", adminSingle.status === 200 && adminSingle.body.data?._id === orderId, JSON.stringify(adminSingle.body));

// 13. Buyer token cannot access admin routes
const buyerOnAdmin = await call("/admin/orders", { headers: { Authorization: `Bearer ${buyerAToken}` } });
check("buyer token rejected on admin route", buyerOnAdmin.status === 401, JSON.stringify(buyerOnAdmin.body));

// 14. Admin rejects invalid status
const badStatus = await call(`/admin/orders/${orderId}/status`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ status: "Bogus" }),
});
check("admin invalid status rejected", badStatus.status === 400, JSON.stringify(badStatus.body));

// 15. Admin updates status validly
const goodStatus = await call(`/admin/orders/${orderId}/status`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${adminToken}` },
  body: JSON.stringify({ status: "Confirmed" }),
});
check(
  "admin valid status update",
  goodStatus.status === 200 && goodStatus.body.data?.status === "Confirmed",
  JSON.stringify(goodStatus.body)
);

// 16. Buyer sees updated status on refresh
const refreshedDetail = await call(`/order/order-history/${orderId}`, {
  headers: { Authorization: `Bearer ${buyerAToken}` },
});
check(
  "buyer sees updated status",
  refreshedDetail.status === 200 && refreshedDetail.body.data?.status === "Confirmed",
  JSON.stringify(refreshedDetail.body)
);

console.log(`\n${passed} passed, ${failed} failed`);
await mongod.stop();
process.exit(failed > 0 ? 1 : 0);
