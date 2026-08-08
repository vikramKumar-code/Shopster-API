import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create();
process.env.MONGO_URI = mongod.getUri();
process.env.JWT_SECRET = "dev_admin_secret";
process.env.JWT_BUYER = "dev_buyer_secret";
process.env.PORT = process.env.PORT || "5055";

console.log("Ephemeral dev MongoDB ready at", mongod.getUri());
await import("../server.js");
