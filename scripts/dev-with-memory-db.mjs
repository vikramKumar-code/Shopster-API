import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create({
  instance: { launchTimeout: 60000 },
});
process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET = "dev_admin_secret";
process.env.JWT_BUYER = "dev_buyer_secret";
process.env.PORT = process.env.PORT || "5055";
process.env.STRIPE_SECRET_KEY =
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder";
process.env.CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

console.log("Ephemeral dev MongoDB ready at", mongod.getUri());
await import("../server.js");
