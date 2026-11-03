import mongoose from "mongoose";
import { randomBytes, scryptSync } from "node:crypto";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "./server/.env" });

const adminSchema = new mongoose.Schema({
  _id: { type: String, default: "admin" },
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

const AdminUser = mongoose.model("AdminUser", adminSchema);

async function setupAdmin() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not configured in .env file");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5
    });
    console.log("✓ Connected to MongoDB");

    const password = "mujuu123@";
    const email = "mujahidhussen75@gmail.com";

    // Generate password hash
    const salt = randomBytes(32);
    const hash = scryptSync(password, salt, 64);
    const passwordHash = `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;

    console.log(`\nSetting up admin account...`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    // Delete existing admin if exists
    await AdminUser.deleteMany({});

    // Create new admin user
    const admin = await AdminUser.create({
      _id: "admin",
      username: email,
      passwordHash: passwordHash
    });

    console.log("✓ Admin user created successfully!");
    console.log(`\nAdmin Details:`);
    console.log(`- ID: ${admin._id}`);
    console.log(`- Username: ${admin.username}`);
    console.log(`- Password Hash: ${admin.passwordHash}`);
    console.log(`- Created At: ${admin.createdAt}`);

    await mongoose.disconnect();
    console.log("\n✓ Disconnected from MongoDB");
    console.log("\n✅ Setup completed! You can now login with the credentials above.");

  } catch (error) {
    console.error("❌ Error setting up admin:", error.message);
    process.exit(1);
  }
}

setupAdmin();
