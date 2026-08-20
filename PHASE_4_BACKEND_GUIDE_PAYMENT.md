# Shopster Phase 4 Backend Guide - Payment Integration (August 2026)

## Executive Summary

Phase 4 is about **adding real payments** to the order system built in Phase 3. By the end of Phase 4, users can pay with cards/UPI via Razorpay or Stripe, and admins can issue refunds.

**Complete payment flow that will work:**
1. Buyer selects payment method at checkout (Cash on Delivery OR Razorpay/Stripe)
2. Backend creates order with payment status "NotInitiated"
3. Frontend calls backend to initiate payment with gateway
4. Backend creates payment order/intent on gateway and returns it to frontend
5. Frontend opens payment form via gateway SDK
6. Buyer completes payment on gateway
7. Gateway sends webhook to your backend with payment success/failure
8. Backend verifies webhook signature and updates order status
9. Buyer downloads invoice (for paid orders)
10. Admin can issue refunds on the payment

**Timeline:** This is a 2-3 week phase. Start with payment integration (Dev A), then invoice/refund (Dev B).

---

## Where We Are

**Phase 1:** Admin auth + admin product CRUD ✅  
**Phase 2:** Buyer auth + buyer profile + cart ✅  
**Phase 3:** Order placement (Cash on Delivery only) + order history + admin order management ✅  
**Phase 4:** Real payments + invoices + refunds (THIS PHASE)

All previous phases must continue to work. Do not break Phase 1/2/3 functionality.

---

## Goal Of Phase 4

Add production-ready payment processing to the Shopster platform:

**For Buyers:**
- Pay orders with card/UPI (Razorpay) or card (Stripe) in test mode
- See payment status on order confirmation
- Download invoices for paid orders
- Get notified of payment failures and can retry

**For Admins:**
- See payment status for all orders
- Issue full or partial refunds
- View refund history

**Technical Goals:**
- Integrate Razorpay OR Stripe in test mode
- Implement webhook signature verification (security critical)
- Handle duplicate webhooks gracefully (idempotency)
- Generate downloadable invoices
- Implement refund processing through gateway
- Comprehensive error handling and logging
- Never hardcode payment keys

---

## Team Split & Responsibilities

### Developer A: Payment Gateway Integration
**Files to create:**
- `utils/razorpayClient.js` or `utils/stripeClient.js`
- `utils/webhookValidator.js`
- `middleware/webhookAuth.js`
- `controllers/paymentController.js`
- `router/paymentRoutes.js`

**Responsibilities:**
- Set up payment gateway test account
- Create payment initiation endpoints
- Implement webhook reception and signature verification
- Update order payment status based on webhooks
- Handle payment failures gracefully
- Test end-to-end payment flow

**Time estimate:** 5-7 days

### Developer B: Invoices & Refunds
**Files to create:**
- `utils/invoiceGenerator.js`
- `controllers/refundController.js`
- `router/refundRoutes.js`

**Responsibilities:**
- Implement invoice generation (PDF or HTML)
- Create invoice download endpoint
- Implement admin refund endpoint
- Process refunds through payment gateway
- Update refund status on orders
- Test refund flow end-to-end

**Time estimate:** 4-5 days

**Coordination Points:**
- Day 1: Decide together (Razorpay vs Stripe, PDF vs HTML)
- Day 3-4: Dev A finishes payment endpoints, Dev B starts on invoices
- Day 5-6: Dev A helps with webhook testing while Dev B does refunds
- Day 7-8: Both test together, fix bugs
- Day 9: Final testing and PR review

---

## CRITICAL: Git & Development Workflow

### Branch Setup
```bash
# Developer A
git pull origin main
git checkout -b feature/phase4-payments-devA
npm install

# Developer B
git pull origin main
git checkout -b feature/phase4-invoices-refunds-devB
npm install
```

### Before Starting Work
```bash
# Run Phase 3 to ensure nothing is broken
npm start

# Test that existing APIs work
curl http://localhost:5000/api/orders
```

### During Development
```bash
# Every morning
git pull origin main  # Get latest from team

# Before committing
npm start             # Verify server starts
# Test your endpoints manually or with Postman

# Commit frequently with clear messages
git add .
git commit -m "feat: implement payment initiation for Razorpay"

# Before PR
git pull origin main  # Merge latest
# Resolve any conflicts in your own branch
npm start             # Test again
```

### Shared Files - COORDINATE BEFORE EDITING
- `server.js` — Both devs modify this
- `models/Order.js` — Both devs read, coordinate before modify
- `package.json` — Only add dependencies, not config

**Rule:** Only ONE person edits a shared file at a time. Pull latest, edit, test, commit, tell other dev.

---

## Current Backend Structure

```
backend-shopster/
├── models/
│   ├── adminModel.js
│   ├── buyerModel.js
│   ├── productModel.js
│   ├── Cart.js
│   └── Order.js (MODIFY in Phase 4)
├── controllers/
│   ├── adminController.js
│   ├── buyerController.js
│   ├── cartController.js
│   ├── orderController.js
│   ├── paymentController.js (NEW - Dev A)
│   └── refundController.js (NEW - Dev B)
├── router/
│   ├── adminRoutes.js
│   ├── buyerRoutes.js
│   ├── cartRoutes.js
│   ├── orderRoutes.js
│   ├── paymentRoutes.js (NEW - Dev A)
│   └── refundRoutes.js (NEW - Dev B)
├── middleware/
│   ├── adminAuth.js
│   ├── buyerAuth.js
│   └── webhookAuth.js (NEW - Dev A)
├── utils/
│   ├── razorpayClient.js (NEW - Dev A, if Razorpay)
│   ├── stripeClient.js (NEW - Dev A, if Stripe)
│   ├── webhookValidator.js (NEW - Dev A)
│   └── invoiceGenerator.js (NEW - Dev B)
├── .env (NEVER commit - only .env.example)
└── .gitignore (ensure .env is listed)
```

**Current API groups:**
- `POST /api/auth/admin/register` - admin registration
- `POST /api/auth/admin/login` - admin login
- `GET /api/product` - list products
- `POST /api/product` - add product (admin only)
- `PUT /api/product/:id` - update product (admin only)
- `DELETE /api/product/:id` - delete product (admin only)
- `POST /api/buyer/register` - buyer registration
- `POST /api/buyer/login` - buyer login
- `GET /api/buyer/profile` - buyer profile
- `PUT /api/buyer/profile` - update profile
- `POST /api/cart/add` - add to cart
- `GET /api/cart` - view cart
- `DELETE /api/cart/:itemId` - remove from cart
- `POST /api/orders` - create order (checkout)
- `GET /api/orders` - buyer's orders
- `GET /api/orders/:id` - buyer's single order
- `GET /api/admin/orders` - admin view all orders
- `GET /api/admin/orders/:id` - admin view single order
- `PUT /api/admin/orders/:id/status` - update order status

**Phase 4 adds:**
- `POST /api/payment/:orderId/initiate-razorpay` - start Razorpay payment
- `POST /api/payment/:orderId/initiate-stripe` - start Stripe payment
- `POST /api/payment/webhook/razorpay` - webhook from Razorpay (no auth needed)
- `POST /api/payment/webhook/stripe` - webhook from Stripe (no auth needed)
- `GET /api/orders/:id/invoice` - download invoice (Dev B)
- `POST /api/admin/refund/:orderId` - issue refund (Dev B)
- `GET /api/admin/refunds` - list refunded orders (Dev B, optional)

---

## Security Rules (CRITICAL - Memorize These)

### 1. Order Ownership Verification
**Rule:** Every buyer-facing endpoint must verify the buyer owns the order.

```javascript
// ALWAYS do this for buyer routes
const order = await Order.findById(orderId);
if (!order) return res.status(404).json({ status: "Fail", message: "Order not found" });

if (order.buyer.toString() !== req.user._id.toString()) {
  // RETURN 404, not 403 - don't reveal if order exists for someone else
  return res.status(404).json({ status: "Fail", message: "Order not found" });
}
```

### 2. Never Trust Frontend Numbers
**Rule:** Always recalculate amounts on the server.

```javascript
// WRONG:
const amount = req.body.amount;  // Frontend sends amount - DANGEROUS!
await payment.create({ amount });

// CORRECT:
const order = await Order.findById(orderId);
const amount = order.totalAmount;  // Server value only
await payment.create({ amount });
```

### 3. Keep Keys in Environment Variables
**Rule:** Zero hardcoded keys. Ever.

```javascript
// WRONG:
const keyId = "rzp_test_abc123def456";  // Hardcoded!

// CORRECT:
const keyId = process.env.RAZORPAY_KEY_ID;  // From .env
if (!keyId) throw new Error("RAZORPAY_KEY_ID not set");
```

### 4. Webhook Signature Verification
**Rule:** Every webhook must be verified. Unsigned webhooks = fake payments.

```javascript
const crypto = require('crypto');
const signature = req.headers['x-razorpay-signature'];
const body = req.rawBody;  // Must be raw string, not parsed JSON
const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');

if (hash !== signature) {
  return res.status(401).json({ status: "Fail", message: "Invalid signature" });
}
// Only if signature matches, process the webhook
```

### 5. Idempotent Webhook Processing
**Rule:** If a webhook arrives twice, don't update the order twice.

```javascript
const order = await Order.findById(orderId);

// Check if already processed
if (order.paymentStatus === 'Paid') {
  // Already processed, just return success
  return res.status(200).json({ status: "Success", message: "Already processed" });
}

// Only update if not already paid
order.paymentStatus = 'Paid';
await order.save();
```

### 6. Never Send Passwords
**Rule:** Use `.select("-password")` when returning user data.

```javascript
// WRONG:
const order = await Order.findById(orderId).populate('buyer');
res.json(order);  // Includes password!

// CORRECT:
const order = await Order.findById(orderId).populate('buyer', '-password');
res.json(order);  // No password
```

### 7. Logging Without Secrets
**Rule:** Log transaction IDs and order IDs, never API keys or tokens.

```javascript
// GOOD:
console.log(`Payment for order ${orderId} completed`);

// BAD:
console.log(`Using key ${process.env.RAZORPAY_KEY_ID}`);  // Never!
console.log(`Webhook payload: ${JSON.stringify(req.body)}`);  // Might contain tokens
```

---

## DEVELOPER A: Payment Gateway Integration

### Step 0: Team Decision - Razorpay or Stripe?

**Razorpay advantages:**
- Better for India (lower fees, more payment methods)
- Simpler setup
- Easier webhook format
- UPI + card support
- Better test account experience

**Stripe advantages:**
- International presence
- Strong for global apps
- More documentation
- Card-only (good for learning)
- Slightly more complex but industry standard

**Recommendation for August 2026:** Use Razorpay if team is in India, Stripe if international.

**Decision:** _______________  (Write which one your team chose)

### Step 1: Create Razorpay/Stripe Test Account (30 minutes)

#### For Razorpay:

1. Open https://razorpay.com/signup
2. Enter email and password (make it secure!)
3. Verify email (check inbox for confirmation link)
4. Fill in:
   - Full name
   - Phone (can be any number for test)
   - Company name: "Shopster"
5. Accept terms and continue
6. **Go to Settings → API Keys**
   - Copy **Key ID** (starts with `rzp_test_`)
   - Copy **Key Secret** (long random string)
   - **SAVE THESE** - you'll use them in .env
7. **Go to Settings → Webhooks**
   - Click "Add Webhook"
   - URL: `http://localhost:5000/api/payment/webhook/razorpay` (for testing)
   - Active Events: `payment.authorized`, `payment.failed`
   - Click "Create"
   - Copy the **Webhook Secret** that appears
   - **SAVE THIS** - goes in .env

**Test Cards for Razorpay:**
- Success: `4111111111111111` (any expiry, any CVV)
- Failure: `4444333322221111` (any expiry, any CVV)

#### For Stripe:

1. Open https://dashboard.stripe.com/register
2. Enter email, password, full name
3. Verify email
4. Set up account (basic info)
5. **Go to Developers → API Keys**
   - Copy **Publishable Key** (test mode, starts with `pk_test_`)
   - Copy **Secret Key** (test mode, starts with `sk_test_`)
   - **SAVE THESE** - go in .env
6. **Go to Developers → Webhooks**
   - Click "Add an endpoint"
   - URL: `http://localhost:5000/api/payment/webhook/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Click "Add endpoint"
   - Copy the **Signing Secret** that appears
   - **SAVE THIS** - goes in .env

**Test Cards for Stripe:**
- Success: `4242424242424242` (any future expiry, any CVV)
- Failure: `4000000000000002` (any future expiry, any CVV)

### Step 2: Create .env File in Backend

Create file: `backend-shopster/.env`

```bash
# Server
NODE_ENV=development
PORT=5000

# Database (from Phase 3)
MONGO_URI=mongodb://localhost:27017/shopster

# Auth (from Phase 3)
JWT_SECRET=your_jwt_secret_key_here_change_this

# Payment Gateway - CHOOSE ONE:

# RAZORPAY (if using Razorpay):
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID_HERE
RAZORPAY_KEY_SECRET=YOUR_KEY_SECRET_HERE
RAZORPAY_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE

# OR STRIPE (if using Stripe):
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE

# URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

**Create `.env.example` for team (template without real keys):**

```bash
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/shopster
JWT_SECRET=

# Choose ONE:
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

**Update `.gitignore` to never commit .env:**

Open `backend-shopster/.gitignore` and verify it has:
```
node_modules/
.env
.env.local
.env.*.local
.DS_Store
```

**Verify .env is not tracked:**
```bash
git status
# Should NOT show .env file
```

### Step 3: Install Payment Gateway SDK

Open terminal in backend folder:

#### For Razorpay:
```bash
npm install razorpay
npm list razorpay  # Verify it installed
```

#### For Stripe:
```bash
npm install stripe
npm list stripe  # Verify it installed
```

**Commit package changes:**
```bash
git add package.json package-lock.json
git commit -m "chore: add payment gateway SDK"
```

### Step 4: Create Payment Gateway Client

Create file: `backend-shopster/utils/razorpayClient.js` (or `stripeClient.js` if using Stripe)

#### For Razorpay:

```javascript
const Razorpay = require('razorpay');

// Check that keys exist before initializing
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('ERROR: Razorpay keys not found in .env file');
  console.error('Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env');
  process.exit(1);
}

// Create and export Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

console.log('✓ Razorpay client initialized with test account');

module.exports = razorpayInstance;
```

#### For Stripe:

```javascript
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERROR: Stripe secret key not found in .env file');
  console.error('Please add STRIPE_SECRET_KEY to .env');
  process.exit(1);
}

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('✓ Stripe client initialized with test account');

module.exports = stripeInstance;
```

**Test that it loads:**
```bash
node -e "require('./utils/razorpayClient.js')"
# Should print: ✓ Razorpay client initialized with test account
```

### Step 5: Update Order Model to Track Payments

Edit `backend-shopster/models/Order.js`

**Current model (from Phase 3):**

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  buyer: { type: Schema.Types.ObjectId, ref: 'Buyer', required: true },
  items: [
    {
      product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  totalAmount: { type: Number, required: true },
  shippingAddress: String,
  paymentMethod: { type: String, enum: ['COD'], default: 'COD' },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', orderSchema);
```

**Updated for Phase 4 (ADD these fields):**

```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const orderSchema = new Schema({
  buyer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Buyer', 
    required: true 
  },
  items: [
    {
      product: { 
        type: Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  totalAmount: { 
    type: Number, 
    required: true 
  },
  shippingAddress: String,
  
  // PAYMENT FIELDS (Phase 4)
  paymentMethod: { 
    type: String, 
    enum: ['COD', 'Razorpay', 'Stripe'],  // ADD Razorpay/Stripe
    default: 'COD' 
  },
  paymentStatus: {
    type: String,
    enum: ['NotInitiated', 'Pending', 'Paid', 'Failed', 'Refunded'],
    default: 'NotInitiated'  // No payment initiated yet
  },
  paymentId: {
    type: String,  // Stores gateway ID (e.g., pay_xxx or payment_intent_xxx)
    default: null
  },
  paymentTimestamp: {
    type: Date,    // When payment completed
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0     // How much was refunded
  },
  refundStatus: {
    type: String,
    enum: ['None', 'Partial', 'Full'],
    default: 'None'
  },
  
  // ORDER STATUS (Phase 3 - keep unchanged)
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  
  timestamps: true  // Adds createdAt and updatedAt automatically
}, { 
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } 
});

// Add indexes for faster queries
orderSchema.index({ buyer: 1, createdAt: -1 });  // For listing buyer's orders
orderSchema.index({ paymentStatus: 1 });          // For admin filtering
orderSchema.index({ paymentId: 1 });              // For webhook lookup

module.exports = mongoose.model('Order', orderSchema);
```

**What changed:**
1. Added `paymentStatus` — tracks payment lifecycle (NotInitiated → Pending → Paid/Failed)
2. Added `paymentId` — stores gateway's ID (Razorpay order ID or Stripe intent ID)
3. Added `paymentTimestamp` — when payment completed
4. Added `refundAmount` and `refundStatus` — for refund tracking (Dev B will use these)
5. Updated `paymentMethod` enum to include 'Razorpay' and 'Stripe'
6. Added database indexes — for faster queries

### Step 6: Create Webhook Authentication Middleware

Create file: `backend-shopster/middleware/webhookAuth.js`

This verifies webhook signatures (critical security):

```javascript
const crypto = require('crypto');

const verifyWebhookSignature = (req, res, next) => {
  try {
    // Determine which gateway based on event type in body
    const eventType = req.body.event ? 'razorpay' : 'stripe';
    
    if (eventType === 'razorpay') {
      // Razorpay webhook verification
      const signature = req.headers['x-razorpay-signature'];
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      
      if (!signature) {
        console.warn('Webhook missing x-razorpay-signature header');
        return res.status(401).json({ 
          status: 'Fail', 
          message: 'Invalid webhook signature' 
        });
      }
      
      if (!secret) {
        console.error('RAZORPAY_WEBHOOK_SECRET not configured');
        return res.status(500).json({ 
          status: 'Fail', 
          message: 'Webhook verification configuration error' 
        });
      }
      
      // The body must be raw string (not parsed JSON)
      // This is set up in server.js before JSON parsing
      const body = req.rawBody || JSON.stringify(req.body);
      
      // Create HMAC hash of body
      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      
      // Compare with webhook signature
      if (hash !== signature) {
        console.warn('Invalid webhook signature received');
        return res.status(401).json({ 
          status: 'Fail', 
          message: 'Invalid webhook signature' 
        });
      }
      
      console.log('✓ Razorpay webhook signature verified');
      next();
      
    } else if (eventType === 'stripe') {
      // Stripe webhook verification
      const signature = req.headers['stripe-signature'];
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!signature || !secret) {
        console.warn('Stripe webhook missing signature or secret');
        return res.status(401).json({ 
          status: 'Fail', 
          message: 'Invalid webhook signature' 
        });
      }
      
      try {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        const body = req.rawBody || JSON.stringify(req.body);
        
        const event = stripe.webhooks.constructEvent(body, signature, secret);
        req.stripeEvent = event;  // Attach event to request
        console.log('✓ Stripe webhook signature verified');
        next();
      } catch (err) {
        console.error('Stripe webhook verification failed:', err.message);
        return res.status(401).json({ 
          status: 'Fail', 
          message: 'Invalid webhook signature' 
        });
      }
    }
  } catch (err) {
    console.error('Webhook verification error:', err);
    res.status(500).json({ 
      status: 'Fail', 
      message: 'Webhook processing error' 
    });
  }
};

module.exports = { verifyWebhookSignature };
```

### Step 7: Create Payment Controller

Create file: `backend-shopster/controllers/paymentController.js`

This handles all payment logic:

```javascript
const Order = require('../models/Order');

// Helper: Validate order is ready for payment
const validateOrderForPayment = async (orderId, buyerId) => {
  const order = await Order.findById(orderId);
  
  if (!order) {
    return { valid: false, error: 'Order not found', status: 404 };
  }
  
  // Verify buyer owns this order
  if (order.buyer.toString() !== buyerId.toString()) {
    return { valid: false, error: 'Order not found', status: 404 };  // Don't reveal ownership
  }
  
  // Can't pay an already-paid order
  if (order.paymentStatus === 'Paid') {
    return { valid: false, error: 'Order is already paid', status: 400 };
  }
  
  // Can't pay a cancelled order
  if (order.status === 'Cancelled') {
    return { valid: false, error: 'Cannot pay for cancelled order', status: 400 };
  }
  
  return { valid: true, order, status: 200 };
};

// ============================================
// RAZORPAY METHODS
// ============================================

exports.initiateRazorpayPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const buyerId = req.user._id;  // From protectBuyer middleware
    
    console.log(`Initiating Razorpay payment for order ${orderId}`);
    
    // Validate order
    const validation = await validateOrderForPayment(orderId, buyerId);
    if (!validation.valid) {
      return res.status(validation.status).json({ 
        status: 'Fail', 
        message: validation.error 
      });
    }
    
    const order = validation.order;
    
    // Verify this order is set up for Razorpay payment
    if (order.paymentMethod !== 'Razorpay') {
      return res.status(400).json({
        status: 'Fail',
        message: 'This order is not set up for Razorpay payment'
      });
    }
    
    try {
      const razorpay = require('../utils/razorpayClient');
      
      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(order.totalAmount * 100),  // Amount in paise (1 rupee = 100 paise)
        currency: 'INR',
        receipt: `order_${order._id}`,  // Unique receipt ID
        payment_capture: 1  // Auto-capture on successful payment
      });
      
      console.log(`Razorpay order created: ${razorpayOrder.id}`);
      
      // Store Razorpay order ID in our database
      // This links our order to the Razorpay order
      order.paymentId = razorpayOrder.id;
      order.paymentStatus = 'Pending';  // Waiting for buyer to pay
      await order.save();
      
      console.log(`Order ${order._id} updated with paymentId and status=Pending`);
      
      // Return Razorpay order ID and public key to frontend
      // Frontend will use these to open Razorpay checkout
      res.status(200).json({
        status: 'Success',
        message: 'Payment initiated. Proceed with Razorpay checkout.',
        data: {
          orderId: order._id,
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,  // Public key for frontend
          totalAmount: order.totalAmount,
          currency: 'INR'
        }
      });
      
    } catch (gatewayError) {
      console.error('Razorpay API error:', gatewayError.message);
      return res.status(500).json({
        status: 'Fail',
        message: 'Failed to initiate payment. Please try again.'
      });
    }
    
  } catch (err) {
    console.error('Error in initiateRazorpayPayment:', err);
    res.status(500).json({ 
      status: 'Fail', 
      message: 'Internal server error' 
    });
  }
};

// Handle Razorpay webhook (called by Razorpay after payment)
exports.handleRazorpayWebhook = async (req, res) => {
  try {
    const { event, payload } = req.body;
    
    console.log(`Received Razorpay webhook event: ${event}`);
    
    if (event === 'payment.authorized') {
      // Payment succeeded
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;  // Link to our order
      const razorpayPaymentId = paymentEntity.id;
      
      console.log(`Payment authorized: ${razorpayPaymentId} for order ${razorpayOrderId}`);
      
      // Find our order by Razorpay order ID
      const order = await Order.findOne({ paymentId: razorpayOrderId });
      
      if (!order) {
        console.warn(`Order not found for Razorpay order ID: ${razorpayOrderId}`);
        // Still return 200 so Razorpay doesn't retry
        return res.status(200).json({ 
          status: 'Success', 
          message: 'Webhook processed' 
        });
      }
      
      // IDEMPOTENCY: Check if already marked as paid
      if (order.paymentStatus === 'Paid') {
        console.log(`Order ${order._id} already marked as paid, ignoring duplicate webhook`);
        return res.status(200).json({ 
          status: 'Success', 
          message: 'Webhook already processed' 
        });
      }
      
      // Update order status to Paid
      order.paymentStatus = 'Paid';
      order.paymentTimestamp = new Date();
      order.status = 'Confirmed';  // Auto-confirm order when paid
      await order.save();
      
      console.log(`✓ Order ${order._id} payment confirmed and status updated to "Paid"`);
      
    } else if (event === 'payment.failed') {
      // Payment failed
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      
      console.log(`Payment failed for Razorpay order: ${razorpayOrderId}`);
      
      const order = await Order.findOne({ paymentId: razorpayOrderId });
      
      if (order) {
        order.paymentStatus = 'Failed';
        await order.save();
        console.log(`Order ${order._id} payment marked as Failed`);
      }
    }
    
    // Always return 200 OK so Razorpay knows we received it
    res.status(200).json({ 
      status: 'Success', 
      message: 'Webhook processed' 
    });
    
  } catch (err) {
    console.error('Error in handleRazorpayWebhook:', err);
    // Still return 200 to acknowledge we received the webhook
    res.status(200).json({ 
      status: 'Success', 
      message: 'Webhook processed' 
    });
  }
};

// ============================================
// STRIPE METHODS (similar structure)
// ============================================

exports.initiateStripePayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const buyerId = req.user._id;
    
    console.log(`Initiating Stripe payment for order ${orderId}`);
    
    const validation = await validateOrderForPayment(orderId, buyerId);
    if (!validation.valid) {
      return res.status(validation.status).json({ 
        status: 'Fail', 
        message: validation.error 
      });
    }
    
    const order = validation.order;
    
    if (order.paymentMethod !== 'Stripe') {
      return res.status(400).json({
        status: 'Fail',
        message: 'This order is not set up for Stripe payment'
      });
    }
    
    try {
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(order.totalAmount * 100),  // Amount in cents
        currency: 'inr',
        metadata: {
          orderId: order._id.toString()
        }
      });
      
      console.log(`Stripe payment intent created: ${paymentIntent.id}`);
      
      order.paymentId = paymentIntent.id;
      order.paymentStatus = 'Pending';
      await order.save();
      
      res.status(200).json({
        status: 'Success',
        message: 'Payment initiated. Proceed with Stripe checkout.',
        data: {
          orderId: order._id,
          clientSecret: paymentIntent.client_secret,  // Frontend uses this
          totalAmount: order.totalAmount,
          currency: 'INR'
        }
      });
      
    } catch (gatewayError) {
      console.error('Stripe API error:', gatewayError.message);
      return res.status(500).json({
        status: 'Fail',
        message: 'Failed to initiate payment. Please try again.'
      });
    }
    
  } catch (err) {
    console.error('Error in initiateStripePayment:', err);
    res.status(500).json({ 
      status: 'Fail', 
      message: 'Internal server error' 
    });
  }
};

// Handle Stripe webhook
exports.handleStripeWebhook = async (req, res) => {
  try {
    const event = req.stripeEvent;  // Set by webhookAuth middleware
    
    console.log(`Received Stripe event: ${event.type}`);
    
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;
      
      console.log(`Stripe payment succeeded for order ${orderId}`);
      
      const order = await Order.findById(orderId);
      
      if (!order) {
        console.warn(`Order not found: ${orderId}`);
        return res.status(200).json({ 
          status: 'Success', 
          message: 'Webhook processed' 
        });
      }
      
      // Idempotency check
      if (order.paymentStatus === 'Paid') {
        console.log(`Order ${orderId} already marked as paid`);
        return res.status(200).json({ 
          status: 'Success', 
          message: 'Webhook already processed' 
        });
      }
      
      order.paymentStatus = 'Paid';
      order.paymentTimestamp = new Date();
      order.status = 'Confirmed';
      await order.save();
      
      console.log(`✓ Order ${orderId} payment confirmed`);
      
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;
      
      console.log(`Stripe payment failed for order ${orderId}`);
      
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = 'Failed';
        await order.save();
      }
    }
    
    res.status(200).json({ 
      status: 'Success', 
      message: 'Webhook processed' 
    });
    
  } catch (err) {
    console.error('Error in handleStripeWebhook:', err);
    res.status(200).json({ 
      status: 'Success', 
      message: 'Webhook processed' 
    });
  }
};
```

### Step 8: Create Payment Routes

Create file: `backend-shopster/router/paymentRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protectBuyer } = require('../middleware/buyerAuth');  // Existing from Phase 2
const { verifyWebhookSignature } = require('../middleware/webhookAuth');  // New

// Buyer routes (PROTECTED - buyer must be logged in)
router.post(
  '/:orderId/initiate-razorpay',
  protectBuyer,
  paymentController.initiateRazorpayPayment
);

router.post(
  '/:orderId/initiate-stripe',
  protectBuyer,
  paymentController.initiateStripePayment
);

// Webhook routes (NOT PROTECTED - called by payment gateway, not user)
// These routes have NO authentication
// Instead, they verify webhook signature in the middleware
router.post(
  '/webhook/razorpay',
  verifyWebhookSignature,
  paymentController.handleRazorpayWebhook
);

router.post(
  '/webhook/stripe',
  verifyWebhookSignature,
  paymentController.handleStripeWebhook
);

module.exports = router;
```

### Step 9: Update server.js to Include Payment Routes

Edit `backend-shopster/server.js`

**CRITICAL: Webhooks need raw body, not parsed JSON.**

Add this BEFORE other middleware:

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ===================================
// CRITICAL: Webhook routes need raw body
// ===================================
// Add these BEFORE express.json()

// Razorpay webhook - raw body
app.post('/api/payment/webhook/razorpay', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString('utf8');  // Convert Buffer to string
  req.body = JSON.parse(req.rawBody);        // Parse as JSON for access in controller
  next();
});

// Stripe webhook - raw body
app.post('/api/payment/webhook/stripe', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString('utf8');
  req.body = JSON.parse(req.rawBody);
  next();
});

// ===================================
// Regular middleware (after webhooks)
// ===================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ===================================
// Routes
// ===================================
// Existing Phase 1/2/3 routes
app.use('/api/auth', require('./router/adminRoutes'));
app.use('/api/product', require('./router/productRoutes'));
app.use('/api/buyer', require('./router/buyerRoutes'));
app.use('/api/cart', require('./router/cartRoutes'));
app.use('/api/orders', require('./router/orderRoutes'));
app.use('/api/admin/orders', require('./router/adminOrderRoutes'));

// NEW Phase 4 route
app.use('/api/payment', require('./router/paymentRoutes'));

// ===================================
// Database & Server Start
// ===================================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Test the payment webhook at: POST http://localhost:${PORT}/api/payment/webhook/razorpay`);
});

module.exports = app;
```

### Step 10: Test Payment Endpoints

**Start your backend:**
```bash
npm start
```

**You should see:**
```
✓ Connected to MongoDB
✓ Server running on port 5000
✓ Razorpay client initialized with test account
```

**Test payment initiation:**

1. Create a test order via Phase 3 checkout or Postman
2. Get the order ID
3. Get a buyer auth token (login as buyer)
4. Make this request:

```bash
curl -X POST http://localhost:5000/api/payment/ORDER_ID/initiate-razorpay \
  -H "Authorization: Bearer YOUR_BUYER_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected response (success):**
```json
{
  "status": "Success",
  "message": "Payment initiated. Proceed with Razorpay checkout.",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "razorpayOrderId": "order_1a2b3c4d5e6f7g",
    "razorpayKeyId": "rzp_test_1234567890",
    "totalAmount": 500,
    "currency": "INR"
  }
}
```

### Step 11: Test Webhook Locally with ngrok

**Install ngrok** (creates internet-accessible tunnel to localhost):

```bash
# Mac
brew install ngrok

# Windows/Linux
# Download from https://ngrok.com/download
```

**Start ngrok:**
```bash
ngrok http 5000
```

**You'll see output:**
```
ngrok by @inconshreveable

Session Status                online
Account                       user@example.com
Version                        3.0.0
Region                         us (United States)
Web Interface                  http://127.0.0.1:4040
Forwarding                     https://abc123.ngrok.io -> http://localhost:5000
```

**Use the forwarding URL** (`https://abc123.ngrok.io`) to update webhook in payment gateway:

- **Razorpay:** Settings → Webhooks → Update URL to `https://abc123.ngrok.io/api/payment/webhook/razorpay`
- **Stripe:** Developers → Webhooks → Update URL to `https://abc123.ngrok.io/api/payment/webhook/stripe`

**Now test end-to-end:**

1. Create order and initiate payment via frontend
2. Complete payment with test card (4111111111111111 for Razorpay)
3. Check backend logs — should see webhook received and order marked as "Paid"
4. Verify in database: order.paymentStatus should be "Paid"

### Dev A Testing Checklist

Before handing off to Dev B:

- [ ] `npm start` runs without errors
- [ ] Razorpay/Stripe client initializes successfully
- [ ] Can initiate payment for an order (returns gateway order ID)
- [ ] Payment initiation only works for order owner (not another buyer)
- [ ] Cannot initiate payment for already-paid order
- [ ] Webhook endpoint rejects unsigned/invalid signatures
- [ ] Valid webhook updates order paymentStatus to "Paid"
- [ ] Valid webhook updates order status to "Confirmed"
- [ ] Duplicate webhooks don't cause issues (idempotency works)
- [ ] Failed payment webhook sets paymentStatus to "Failed"
- [ ] All Phase 1/2/3 endpoints still work
- [ ] No API keys hardcoded anywhere
- [ ] `.env` file is not committed (check with `git status`)
- [ ] Backend logs show "Payment initiated" and "Payment confirmed" messages

---

## DEVELOPER B: Invoice Generation & Refunds

*Continue reading in the next section...*

### Step 1: Choose Invoice Format

**PDF:**
- Pros: Professional, downloadable, works offline
- Cons: More setup (pdfkit library)
- Recommended for: Production apps

**HTML:**
- Pros: Simple, lightweight, easy to modify
- Cons: Browser-dependent, print formatting can be tricky
- Recommended for: MVP or learning

**Decision for your team:** ____________ (PDF or HTML)

### Step 2: Install Invoice Dependencies

#### For PDF:
```bash
npm install pdfkit
```

#### For HTML (EJS template):
```bash
npm install ejs
```

**Commit:**
```bash
git add package.json package-lock.json
git commit -m "chore: add invoice generation dependencies"
```

### Step 3: Create Invoice Generator

Create file: `backend-shopster/utils/invoiceGenerator.js`

#### Option A: HTML Invoice

```javascript
const ejs = require('ejs');
const path = require('path');

const generateHTMLInvoice = async (order) => {
  try {
    // Prepare data for template
    const invoiceData = {
      invoiceNumber: order._id.toString().slice(-8).toUpperCase(),  // Short ID
      orderDate: new Date(order.createdAt).toLocaleDateString('en-IN'),
      paymentDate: order.paymentTimestamp ? new Date(order.paymentTimestamp).toLocaleDateString('en-IN') : 'N/A',
      
      buyer: {
        name: order.buyer.name || 'Customer',
        email: order.buyer.email || 'N/A',
        phone: order.buyer.phone || 'N/A',
        address: order.shippingAddress || 'N/A'
      },
      
      items: order.items || [],
      subtotal: order.totalAmount || 0,
      tax: 0,  // No tax for Phase 4
      total: order.totalAmount || 0,
      
      paymentMethod: order.paymentMethod || 'COD',
      paymentStatus: order.paymentStatus || 'Pending',
      
      company: {
        name: 'Shopster',
        address: 'Shopster HQ',
        phone: '+91-XXXXXXXXXX',
        email: 'support@shopster.in'
      }
    };
    
    // HTML template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice <%= invoiceNumber %></title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
          .company-name { font-size: 28px; font-weight: bold; color: #333; }
          .invoice-title { font-size: 18px; color: #666; margin-top: 10px; }
          .details { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .detail-box { flex: 1; }
          .detail-label { font-weight: bold; color: #333; margin-bottom: 5px; }
          .detail-value { color: #666; margin-bottom: 5px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background-color: #f5f5f5; padding: 10px; text-align: left; font-weight: bold; border-bottom: 2px solid #ddd; }
          td { padding: 10px; border-bottom: 1px solid #eee; }
          .total-row { font-weight: bold; font-size: 16px; background-color: #f9f9f9; }
          .footer { text-align: center; border-top: 1px solid #ddd; padding-top: 20px; color: #666; font-size: 12px; }
          .payment-status { padding: 10px; background-color: #d4edda; color: #155724; border-radius: 4px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
            <div class="company-name"><%= company.name %></div>
            <div class="invoice-title">INVOICE</div>
          </div>
          
          <!-- Invoice Details -->
          <div class="details">
            <div class="detail-box">
              <div class="detail-label">Invoice Number</div>
              <div class="detail-value"><%= invoiceNumber %></div>
              <div class="detail-label" style="margin-top: 10px;">Invoice Date</div>
              <div class="detail-value"><%= orderDate %></div>
            </div>
            <div class="detail-box">
              <div class="detail-label">Payment Date</div>
              <div class="detail-value"><%= paymentDate %></div>
              <div class="detail-label" style="margin-top: 10px;">Payment Method</div>
              <div class="detail-value"><%= paymentMethod %></div>
            </div>
          </div>
          
          <!-- Payment Status -->
          <% if (paymentStatus === 'Paid') { %>
            <div class="payment-status">✓ Payment Completed Successfully</div>
          <% } %>
          
          <!-- Buyer Details -->
          <div style="margin-bottom: 20px;">
            <div class="detail-label">Bill To:</div>
            <div class="detail-value">
              <strong><%= buyer.name %></strong><br>
              Email: <%= buyer.email %><br>
              Phone: <%= buyer.phone %><br>
              Address: <%= buyer.address %>
            </div>
          </div>
          
          <!-- Items Table -->
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <% items.forEach(item => { %>
                <tr>
                  <td><%= item.name %></td>
                  <td style="text-align: center;"><%= item.quantity %></td>
                  <td style="text-align: right;">₹<%= item.price.toFixed(2) %></td>
                  <td style="text-align: right;">₹<%= (item.price * item.quantity).toFixed(2) %></td>
                </tr>
              <% }); %>
            </tbody>
          </table>
          
          <!-- Totals -->
          <div style="text-align: right; margin-bottom: 20px;">
            <div style="margin-bottom: 10px;">
              <span>Subtotal: </span>
              <strong>₹<%= subtotal.toFixed(2) %></strong>
            </div>
            <div style="margin-bottom: 10px;">
              <span>Tax: </span>
              <strong>₹<%= tax.toFixed(2) %></strong>
            </div>
            <div class="total-row" style="padding: 10px; border: 2px solid #333;">
              <span>Total Amount: </span>
              <strong>₹<%= total.toFixed(2) %></strong>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p><strong><%= company.name %></strong></p>
            <p><%= company.address %></p>
            <p>Phone: <%= company.phone %> | Email: <%= company.email %></p>
            <p>Thank you for your purchase!</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Render template
    const htmlContent = await ejs.render(html, {
      invoiceNumber: invoiceData.invoiceNumber,
      orderDate: invoiceData.orderDate,
      paymentDate: invoiceData.paymentDate,
      buyer: invoiceData.buyer,
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      tax: invoiceData.tax,
      total: invoiceData.total,
      paymentMethod: invoiceData.paymentMethod,
      paymentStatus: invoiceData.paymentStatus,
      company: invoiceData.company
    });
    
    return {
      content: htmlContent,
      type: 'text/html',
      filename: `invoice_${invoiceData.invoiceNumber}.html`
    };
    
  } catch (err) {
    console.error('Error generating HTML invoice:', err);
    throw err;
  }
};

module.exports = { generateHTMLInvoice };
```

#### Option B: PDF Invoice (more professional)

```javascript
const PDFDocument = require('pdfkit');

const generatePDFInvoice = async (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        bufferPages: true,
        margin: 50
      });
      
      const invoiceNumber = order._id.toString().slice(-8).toUpperCase();
      const orderDate = new Date(order.createdAt).toLocaleDateString('en-IN');
      const paymentDate = order.paymentTimestamp 
        ? new Date(order.paymentTimestamp).toLocaleDateString('en-IN') 
        : 'N/A';
      
      // Collect PDF output
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('SHOPSTER', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Invoice details
      doc.fontSize(10).font('Helvetica-Bold').text('Invoice Details', { underline: true });
      doc.font('Helvetica').text(`Invoice #: ${invoiceNumber}`);
      doc.text(`Invoice Date: ${orderDate}`);
      doc.text(`Payment Date: ${paymentDate}`);
      doc.text(`Payment Method: ${order.paymentMethod || 'COD'}`);
      doc.moveDown();
      
      // Buyer info
      doc.fontSize(10).font('Helvetica-Bold').text('Bill To:', { underline: true });
      doc.font('Helvetica').text(`Name: ${order.buyer?.name || 'N/A'}`);
      doc.text(`Email: ${order.buyer?.email || 'N/A'}`);
      doc.text(`Phone: ${order.buyer?.phone || 'N/A'}`);
      doc.text(`Address: ${order.shippingAddress || 'N/A'}`);
      doc.moveDown();
      
      // Items table header
      const tableTop = doc.y;
      const col1 = 50, col2 = 250, col3 = 350, col4 = 450;
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Product', col1, tableTop);
      doc.text('Qty', col2, tableTop);
      doc.text('Price', col3, tableTop);
      doc.text('Total', col4, tableTop);
      
      // Line under header
      doc.moveTo(col1, tableTop + 20).lineTo(550, tableTop + 20).stroke();
      
      // Items rows
      let yPosition = tableTop + 30;
      doc.font('Helvetica').fontSize(9);
      
      (order.items || []).forEach(item => {
        const itemTotal = (item.price * item.quantity).toFixed(2);
        doc.text(item.name, col1, yPosition);
        doc.text(item.quantity.toString(), col2, yPosition);
        doc.text(`₹${item.price.toFixed(2)}`, col3, yPosition);
        doc.text(`₹${itemTotal}`, col4, yPosition);
        yPosition += 25;
      });
      
      // Bottom line
      doc.moveTo(col1, yPosition).lineTo(550, yPosition).stroke();
      yPosition += 15;
      
      // Totals
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`Total Amount: ₹${order.totalAmount.toFixed(2)}`, col4 - 100, yPosition, {
        align: 'right'
      });
      
      yPosition += 40;
      doc.fontSize(9).font('Helvetica');
      doc.text(`Payment Status: ${order.paymentStatus}`, 50, yPosition);
      
      doc.moveDown();
      doc.fontSize(8).text('Thank you for your purchase!', { align: 'center' });
      doc.text('Shopster | support@shopster.in', { align: 'center' });
      
      doc.end();
      
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePDFInvoice };
```

### Step 4: Create Refund Controller

Create file: `backend-shopster/controllers/refundController.js`

```javascript
const Order = require('../models/Order');

// Admin: Issue a refund
exports.issueRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount, reason } = req.body;
    
    console.log(`Refund requested for order ${orderId}: amount=₹${amount}, reason=${reason}`);
    
    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'Fail',
        message: 'Refund amount must be greater than 0'
      });
    }
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        status: 'Fail',
        message: 'Refund reason is required'
      });
    }
    
    // Fetch order
    const order = await Order.findById(orderId).populate('buyer', '-password');
    
    if (!order) {
      return res.status(404).json({
        status: 'Fail',
        message: 'Order not found'
      });
    }
    
    // Validate order is paid
    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({
        status: 'Fail',
        message: `Cannot refund. Order payment status is ${order.paymentStatus}`
      });
    }
    
    // Validate refund amount doesn't exceed order total
    const alreadyRefunded = order.refundAmount || 0;
    const maxRefundable = order.totalAmount - alreadyRefunded;
    
    if (amount > maxRefundable) {
      return res.status(400).json({
        status: 'Fail',
        message: `Maximum refundable amount is ₹${maxRefundable}. Already refunded: ₹${alreadyRefunded}`
      });
    }
    
    try {
      // Process refund through payment gateway
      if (order.paymentMethod === 'Razorpay') {
        const razorpay = require('../utils/razorpayClient');
        
        const refund = await razorpay.refunds.create({
          payment_id: order.paymentId,
          amount: Math.round(amount * 100),  // Paise
          notes: {
            orderId: order._id.toString(),
            reason: reason
          }
        });
        
        console.log(`Razorpay refund created: ${refund.id}`);
        
      } else if (order.paymentMethod === 'Stripe') {
        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const refund = await stripe.refunds.create({
          payment_intent: order.paymentId,
          amount: Math.round(amount * 100),  // Cents
          metadata: {
            orderId: order._id.toString(),
            reason: reason
          }
        });
        
        console.log(`Stripe refund created: ${refund.id}`);
        
      } else if (order.paymentMethod === 'COD') {
        return res.status(400).json({
          status: 'Fail',
          message: 'Cannot refund Cash on Delivery orders through this system'
        });
      }
      
      // Update order with refund info
      order.refundAmount = (order.refundAmount || 0) + amount;
      
      // Determine refund status
      if (order.refundAmount >= order.totalAmount) {
        order.refundStatus = 'Full';
        order.paymentStatus = 'Refunded';
      } else {
        order.refundStatus = 'Partial';
      }
      
      await order.save();
      
      console.log(`✓ Refund processed for order ${orderId}. Total refunded: ₹${order.refundAmount}`);
      
      res.status(200).json({
        status: 'Success',
        message: `Refund of ₹${amount} issued successfully`,
        data: {
          orderId: order._id,
          refundAmount: order.refundAmount,
          refundStatus: order.refundStatus,
          paymentStatus: order.paymentStatus
        }
      });
      
    } catch (gatewayError) {
      console.error('Payment gateway refund error:', gatewayError.message);
      return res.status(500).json({
        status: 'Fail',
        message: 'Failed to process refund through payment gateway'
      });
    }
    
  } catch (err) {
    console.error('Error in issueRefund:', err);
    res.status(500).json({
      status: 'Fail',
      message: 'Internal server error'
    });
  }
};

// Admin: List refunded orders
exports.listRefunds = async (req, res) => {
  try {
    // Find all orders with refunds
    const refunds = await Order.find({ refundAmount: { $gt: 0 } })
      .populate('buyer', 'name email phone')
      .sort({ updatedAt: -1 });
    
    res.status(200).json({
      status: 'Success',
      message: 'Refunded orders retrieved',
      data: refunds.map(order => ({
        orderId: order._id,
        buyer: order.buyer,
        totalAmount: order.totalAmount,
        refundAmount: order.refundAmount,
        refundStatus: order.refundStatus,
        paymentStatus: order.paymentStatus,
        refundedAt: order.updatedAt
      }))
    });
    
  } catch (err) {
    console.error('Error in listRefunds:', err);
    res.status(500).json({
      status: 'Fail',
      message: 'Internal server error'
    });
  }
};
```

### Step 5: Create Invoice Download Endpoint

Add to `controllers/orderController.js` or create endpoint in a separate controller:

```javascript
const Order = require('../models/Order');
const { generateHTMLInvoice } = require('../utils/invoiceGenerator');
// const { generatePDFInvoice } = require('../utils/invoiceGenerator');  // If using PDF

// Buyer: Download invoice for own order
exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const buyerId = req.user._id;
    
    console.log(`Invoice download requested for order ${orderId}`);
    
    // Fetch order
    const order = await Order.findById(orderId)
      .populate('buyer', '-password')
      .populate('items.product');
    
    if (!order) {
      return res.status(404).json({
        status: 'Fail',
        message: 'Order not found'
      });
    }
    
    // Verify buyer owns this order
    if (order.buyer._id.toString() !== buyerId.toString()) {
      return res.status(404).json({
        status: 'Fail',
        message: 'Order not found'
      });
    }
    
    // Invoice only available for paid orders
    if (order.paymentStatus !== 'Paid') {
      return res.status(400).json({
        status: 'Fail',
        message: 'Invoice is only available for paid orders'
      });
    }
    
    try {
      // Generate invoice (HTML)
      const invoice = await generateHTMLInvoice(order);
      
      // Set response headers for download/display
      res.setHeader('Content-Type', invoice.type);
      res.setHeader('Content-Disposition', `attachment; filename=${invoice.filename}`);
      
      // Send invoice
      res.send(invoice.content);
      
      console.log(`✓ Invoice sent for order ${orderId}`);
      
      // If using PDF:
      // const pdfBuffer = await generatePDFInvoice(order);
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader('Content-Disposition', `attachment; filename=invoice_${orderId}.pdf`);
      // res.send(pdfBuffer);
      
    } catch (generateErr) {
      console.error('Invoice generation error:', generateErr);
      return res.status(500).json({
        status: 'Fail',
        message: 'Failed to generate invoice'
      });
    }
    
  } catch (err) {
    console.error('Error in downloadInvoice:', err);
    res.status(500).json({
      status: 'Fail',
      message: 'Internal server error'
    });
  }
};
```

### Step 6: Create Refund Routes

Create file: `backend-shopster/router/refundRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const refundController = require('../controllers/refundController');
const { protect } = require('../middleware/adminAuth');  // Admin only

// Admin routes (PROTECTED - admin only)
router.post(
  '/:orderId',
  protect,
  refundController.issueRefund
);

router.get(
  '/',
  protect,
  refundController.listRefunds
);

module.exports = router;
```

### Step 7: Add Invoice Route to Order Routes

Edit `backend-shopster/router/orderRoutes.js`

Add this endpoint for buyers to download invoices:

```javascript
const { downloadInvoice } = require('../controllers/orderController');  // or refundController
const { protectBuyer } = require('../middleware/buyerAuth');

// Add to existing routes:
router.get(
  '/:orderId/invoice',
  protectBuyer,
  downloadInvoice
);
```

### Step 8: Update server.js to Include Refund Routes

Edit `backend-shopster/server.js` and add refund route:

```javascript
// Add this with other routes:
app.use('/api/admin/refund', require('./router/refundRoutes'));
```

### Step 9: Test Invoice Generation

**Test invoice download:**

1. Create a paid order (go through payment flow)
2. Try to download invoice:

```bash
curl http://localhost:5000/api/orders/ORDER_ID/invoice \
  -H "Authorization: Bearer BUYER_TOKEN" \
  -o invoice.html

# Open invoice.html in browser
open invoice.html
```

### Step 10: Test Refund Flow

**Test admin refund:**

1. Have a paid order
2. Get admin token (admin login)
3. Make refund request:

```bash
curl -X POST http://localhost:5000/api/admin/refund/ORDER_ID \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 250,
    "reason": "Customer requested refund"
  }'
```

**Expected response:**
```json
{
  "status": "Success",
  "message": "Refund of ₹250 issued successfully",
  "data": {
    "orderId": "507f1f77bcf86cd799439011",
    "refundAmount": 250,
    "refundStatus": "Partial",
    "paymentStatus": "Paid"
  }
}
```

### Dev B Testing Checklist

- [ ] Invoice generates successfully (HTML or PDF)
- [ ] Invoice only downloads for paid orders
- [ ] Invoice includes all order details (items, total, buyer info)
- [ ] Buyer cannot download another buyer's invoice
- [ ] Admin can issue full refund on paid order
- [ ] Admin can issue partial refund
- [ ] Cannot refund more than order total
- [ ] Cannot refund unpaid order
- [ ] Refund processes through payment gateway
- [ ] Order shows updated refund amount after refund
- [ ] Admin can list all refunded orders
- [ ] All Phase 1/2/3 endpoints still work

---

## Full Phase 4 Testing Workflow

### Day 1-2: Dev A Setup & Testing
- [ ] Dev A sets up payment gateway account
- [ ] Dev A creates .env with test keys
- [ ] Dev A implements payment controller & routes
- [ ] Dev A tests payment initiation endpoint
- [ ] Dev A tests webhook locally with ngrok

### Day 3-4: Dev B Setup & Testing
- [ ] Dev B installs invoice dependencies
- [ ] Dev B implements invoice generator
- [ ] Dev B creates invoice download endpoint
- [ ] Dev B tests invoice generation & download
- [ ] Dev B verifies invoice only works for paid orders

### Day 5-6: Dev A & B Integration Testing
- [ ] Both devs test together end-to-end
- [ ] Place order → Select payment method → Pay → Download invoice
- [ ] Admin issues refund → Verify refund processed
- [ ] Test all error scenarios (duplicate webhooks, invalid orders, etc.)

### Day 7-8: Final Testing & Documentation
- [ ] Run full test suite (if exists)
- [ ] Manual testing of complete flow
- [ ] Write PR description with API list
- [ ] Prepare for code review

---

## Final Checklist Before PR

- [ ] All .env keys are in `.env` (NOT committed)
- [ ] `.env.example` template is committed
- [ ] `npm start` runs without errors
- [ ] All Phase 1/2/3 APIs still work
- [ ] Payment initiation works
- [ ] Webhook processes successfully
- [ ] Invoice downloads work
- [ ] Refunds process through gateway
- [ ] No hardcoded API keys anywhere
- [ ] No passwords in API responses
- [ ] Proper HTTP status codes used
- [ ] Error messages are clear
- [ ] Database indexes added for performance
- [ ] Git history is clean (no accidental commits of .env)
- [ ] PR description lists all new endpoints

---

## Common Errors & Solutions

### "RAZORPAY_KEY_ID not set"
**Problem:** .env file not loaded
**Solution:** 
```bash
# Verify .env exists
ls -la .env

# Verify it has values
cat .env

# Restart server
npm start
```

### "Invalid webhook signature"
**Problem:** Signature verification failing
**Solution:**
- Verify webhook secret in .env matches gateway settings
- Ensure req.rawBody is string (not parsed JSON)
- Check server.js has raw body middleware BEFORE JSON parsing

### "Order not found" in webhook
**Problem:** Webhook arrives before order is created
**Solution:** This shouldn't happen - order created before payment initiated. But if it does:
- Add logging to see what's being sent
- Verify paymentId is being stored in database
- Check webhook URL is correct in gateway settings

### "Order is already paid" error when paying
**Problem:** Trying to re-pay an order
**Solution:** This is expected - check frontend logic to prevent retry button after successful payment

---

## API Summary for Frontend

By end of Phase 4, these endpoints exist:

**Buyer:**
- `POST /api/payment/:orderId/initiate-razorpay` - Start Razorpay payment
- `POST /api/payment/:orderId/initiate-stripe` - Start Stripe payment
- `GET /api/orders/:id/invoice` - Download invoice

**Admin:**
- `POST /api/admin/refund/:orderId` - Issue refund
- `GET /api/admin/refunds` - List refunded orders

**Webhooks (internal):**
- `POST /api/payment/webhook/razorpay` - Razorpay callback
- `POST /api/payment/webhook/stripe` - Stripe callback

All responses follow the standard format:
```json
{
  "status": "Success" or "Fail",
  "message": "Human-readable message",
  "data": { /* response data */ }
}
```

---

---

**Good luck! 🚀**

Timeline: 2 weeks  
Team: 2 developers  
Success metric: Complete end-to-end payment flow working with test transactions
