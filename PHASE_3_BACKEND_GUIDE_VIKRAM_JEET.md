# Shopster Phase 3 Backend Guide - Vikram And Jeet

## Where We Are

Phase 1 gave us admin authentication and admin product CRUD.

Phase 2 gave us buyer authentication, buyer profile CRUD, and buyer cart CRUD.

Both are done and tested. Do not break them.

## Goal Of Phase 3

Phase 3 turns a cart into a real order.

- Buyer can place an order from their cart (checkout)
- Order model
- Buyer order history
- Admin order management (view all orders, view one order, update order status)

Payment gateways, invoices, and refunds are Phase 4. Delivery tracking, reviews, and admin analytics are Phase 5. Do not build those now. See the bottom of this doc for a short preview of Phase 4 and Phase 5 so you understand where Phase 3 fits, but only Phase 3 work should ship in this phase.

Phase 3 checkout is **Cash on Delivery only**. There is no payment form, no payment gateway call, and no payment status beyond "not paid yet."

## Team Split

Recommended split:

- Vikram: Order model, place-order (checkout) API, buyer order history API
- Jeet: Admin order APIs (list all, view one, update status)

Do not edit each other's files unless discussed first.

## Branch Rule

Same as Phase 2:

1. Pull latest code.
2. Switch to your own branch.
3. Run backend locally.
4. Check existing admin/product/buyer/cart APIs still work before adding order code.
5. Create only the files assigned to you.

Before raising a PR:

1. Pull latest main branch into your branch.
2. Resolve conflicts in your own branch.
3. Test your APIs.
4. Mention which endpoints you added.

## Current Backend Structure

Important folders (unchanged from Phase 2):

- `models`
- `controllers`
- `router`
- `middleware`
- `utils`
- `config`
- `server.js`

Current API groups:

- `/api/auth` (admin)
- `/api/product`
- `/api/buyer`
- `/api/cart`

Phase 3 adds:

- `/api/orders` (buyer-facing: create order, view own orders)
- `/api/admin/orders` (admin-facing: view all orders, update status)

## Shared Rules For Both Developers

Keep using the same response format as Phase 2:

```json
{
  "status": "Success",
  "message": "Short message",
  "data": {}
}
```

```json
{
  "status": "Fail",
  "message": "Short error message"
}
```

Use proper HTTP status codes (400 for bad input, 401 for missing/invalid auth, 403/404 for access to something that isn't yours or doesn't exist, 500 only for real server errors).

**Learn from the Phase 2 bug we fixed:** never trust an `:id` from the URL or body when deciding whose data to read, update, or return. A buyer profile update endpoint used to accept any buyer id in the URL, which let one buyer edit another buyer's account. For orders, this matters even more — always check `order.buyer.toString() === req.user._id.toString()` before returning an order to a buyer. Admin routes are the only place allowed to read any order regardless of buyer.

Do not send buyer passwords in any response.

Do not add payment gateway code, invoice code, or delivery-tracking code in Phase 3.

## Vikram Responsibility - Order Placement And Buyer History

Suggested files:

- `models/Order.js`
- `controllers/orderController.js`
- `router/orderRoutes.js`

Avoid editing:

- Buyer files (`models/buyerModel.js`, `controllers/buyerController.js`, `router/buyerRoutes.js`)
- Cart files (`models/Cart.js`, `controllers/cartController.js`) — read from them, don't rewrite them
- Jeet's admin order files

## Vikram Step 0 (Optional) - Stock Field On Product

If the team wants basic stock validation at checkout, add a `stock` field (`Number`, default `0` or a starting value) to `models/productModel.js`. This is optional for Phase 3 — if the team decides to skip real stock tracking, just make sure the order API does not crash when `stock` is undefined.

If you add it, coordinate with whoever owns the admin add/update product form so admins can set a stock value, and keep the change small — do not rewrite the whole product schema.

## Vikram Step 1 - Order Model

Create an Order model.

Fields to consider:

- `buyer` — ref to Buyer, required
- `items` — array of `{ product: ref to Product, name, price, quantity }`
  - Snapshot `name` and `price` at order time. Do not rely on the live product price later — if an admin changes a price after the order, the order should still show what the buyer actually paid.
- `totalAmount` — Number, calculated on the server, never trust a total sent from the frontend
- `shippingAddress` — String (can start as a snapshot of the buyer's profile address)
- `paymentMethod` — String enum, only `"COD"` allowed in Phase 3
- `status` — String enum: `"Pending"`, `"Confirmed"`, `"Shipped"`, `"Delivered"`, `"Cancelled"`, default `"Pending"`
- timestamps

Beginner checklist:

1. Create the order schema with the fields above.
2. Make `buyer`, `items`, and `totalAmount` required.
3. Restrict `status` to the enum values above.
4. Add timestamps.
5. Export the model.

Do not add `paymentId`, `razorpayOrderId`, or any gateway-specific field yet — that's Phase 4.

## Vikram Step 2 - Place Order API (Checkout)

Suggested route:

- `POST /api/orders`

Expected behavior:

1. Protect the route with `protectBuyer`.
2. Load the buyer's cart and populate product details.
3. If the cart is empty, return a clear 400 error — do not create an empty order.
4. Build `items` from the cart, snapshotting `name` and `price` from each product at this moment.
5. Calculate `totalAmount` on the server from the snapshotted items — never trust a total in the request body.
6. Create the Order with `status: "Pending"` and `paymentMethod: "COD"`.
7. Clear the buyer's cart after the order is created successfully (reuse the existing cart-clearing logic).
8. Return the created order.

## Vikram Step 3 - Buyer Order History APIs

Suggested routes:

- `GET /api/orders` — list the logged-in buyer's own orders, most recent first
- `GET /api/orders/:id` — one order's detail

Beginner checklist:

1. Protect both routes with `protectBuyer`.
2. For the list route, query `Order.find({ buyer: req.user._id })`.
3. For the detail route, fetch the order by id, then verify `order.buyer.toString() === req.user._id.toString()` before returning it. If it doesn't match, return 404 (not 403) so buyers can't tell the difference between "not yours" and "doesn't exist."

## Jeet Responsibility - Admin Order Management

Suggested files:

- `controllers/adminOrderController.js`
- `router/adminOrderRoutes.js`

Avoid editing:

- Vikram's `models/Order.js` (read from it, don't redefine it)
- Buyer and cart files
- Product controller, unless only reading product data

## Jeet Step 1 - Order Status Rules

Decide the allowed status values (reuse Vikram's enum: `Pending`, `Confirmed`, `Shipped`, `Delivered`, `Cancelled`). Keep the transition rules simple for Phase 3:

- Any status can move to `Cancelled` except `Delivered`.
- Otherwise moving forward in the list above is fine (`Pending` → `Confirmed` → `Shipped` → `Delivered`).
- Reject anything that isn't one of the five values with a 400 error.

You do not need a state-machine library — a simple `if` check against an array of allowed values is enough for Phase 3.

## Jeet Step 2 - Admin: List All Orders API

Suggested route:

- `GET /api/admin/orders`

Expected behavior:

1. Protect with the existing admin `protect` middleware.
2. Return all orders, most recent first.
3. Populate `buyer` (name/email only, never password) and `items.product`.
4. Support an optional `?status=Pending` query filter.

## Jeet Step 3 - Admin: View One Order API

Suggested route:

- `GET /api/admin/orders/:id`

Same population as the list API, just for a single order. Return 404 if it doesn't exist.

## Jeet Step 4 - Admin: Update Order Status API

Suggested route:

- `PUT /api/admin/orders/:id/status`

Expected body:

```json
{
  "status": "Confirmed"
}
```

Expected behavior:

1. Protect with the admin `protect` middleware.
2. Validate `status` is one of the allowed enum values.
3. Apply the simple transition rule from Step 1.
4. Save and return the updated order.

## Jeet Step 5 - Mount Order Routes

Add both route groups in `server.js`:

- `app.use("/api/orders", orderRoutes);`
- `app.use("/api/admin/orders", adminOrderRoutes);`

Only one person should edit `server.js` at a time — coordinate with Vikram.

## Conflict Avoidance Rules

Vikram owns:

- `models/Order.js`
- `controllers/orderController.js`
- `router/orderRoutes.js`

Jeet owns:

- `controllers/adminOrderController.js`
- `router/adminOrderRoutes.js`

Shared files:

- `server.js`
- `package.json`
- `package-lock.json`

Rules for shared files: pull latest before editing, make the smallest possible change, tell the other developer after editing.

## Shared API Contract With Neelam

Give Neelam the final routes and example responses. At minimum, share:

- Place order route and expected body
- Buyer order history routes
- Admin order routes and the status-update body
- Example success and error responses for each

## Suggested Phase 3 API List

Buyer-facing:

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`

Admin-facing:

- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `PUT /api/admin/orders/:id/status`

## Testing Checklist For Vikram

- Cannot place an order with an empty cart.
- Placing an order clears the cart.
- Order total is calculated on the server, not trusted from the request.
- Buyer can see their own order history.
- Buyer cannot view another buyer's order by guessing an order id.
- Admin, product, buyer, and cart APIs from Phase 1/2 still work.

## Testing Checklist For Jeet

- Admin can list all orders across all buyers.
- Admin can view one order with buyer and product details populated (no password ever included).
- Admin can update an order's status.
- An invalid status value is rejected with a clear error.
- A non-admin (buyer token) cannot reach any `/api/admin/orders` route.

## What Not To Build In Phase 3

Do not build:

- Razorpay, Stripe, or any payment gateway integration
- Invoice or receipt generation
- Refund handling
- Delivery/shipment tracking or courier integration
- Product reviews or ratings
- Coupons or discounts
- Wishlist
- Real admin analytics/reports (the dashboard's stat cards can stay as placeholders)

These are Phase 4 or Phase 5, described briefly below.

## Coming In Phase 4 (Preview Only — Not Built In Phase 3)

Phase 4 adds real payments on top of the Order model built in Phase 3:

- Razorpay or Stripe integration in test mode
- Payment status linked to an order (e.g. `paymentStatus`, `paymentId` fields added to Order)
- Payment verification/webhook handling
- Invoice or receipt generation (PDF or simple downloadable HTML)
- Admin-initiated refunds

## Coming In Phase 5 (Preview Only — Not Built In Phase 3 Or 4)

Phase 5 is polish and post-purchase experience:

- Delivery/shipment tracking status and timeline
- Order status notifications (email)
- Product reviews and ratings
- Wishlist
- Coupons and discount codes
- Real admin analytics/reports replacing today's placeholder dashboard numbers

## Pull Request Checklist

Before pushing:

1. Run `npm start` and confirm the server starts.
2. Test your own APIs.
3. Test that admin, product, buyer, and cart APIs still work.
4. Check there are no conflict markers.
5. Write a short PR note with routes added.
6. Mention which frontend work is waiting on your API.
