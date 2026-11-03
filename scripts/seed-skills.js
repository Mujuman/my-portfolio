import { MongoClient } from "mongodb";
import { defaultSkills, defaultProjects, defaultProfile } from "../server/defaults.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: "./server/.env" });

async function seedData() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000
  });

  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("✓ Connected to MongoDB\n");

    const db = client.db("muhahids_portfolio_db");
    
    // Seed Skills
    console.log("Seeding skills...");
    try {
      await db.collection("portfolioskills").insertMany(defaultSkills);
      console.log(`✓ ${defaultSkills.length} skills created\n`);
    } catch (err) {
      if (err.code === 11000) {
        console.log("✓ Skills already exist\n");
      } else {
        throw err;
      }
    }

    // Seed Projects
    console.log("Seeding projects...");
    try {
      await db.collection("portfolioprojects").insertMany(defaultProjects);
      console.log(`✓ ${defaultProjects.length} projects created\n`);
    } catch (err) {
      if (err.code === 11000) {
        console.log("✓ Projects already exist\n");
      } else {
        throw err;
      }
    }

    // Seed Profile
    console.log("Seeding profile...");
    try {
      await db.collection("portfolioprofiles").insertOne(defaultProfile);
      console.log("✓ Profile created\n");
    } catch (err) {
      if (err.code === 11000) {
        console.log("✓ Profile already exists\n");
      } else {
        throw err;
      }
    }

    // Display all skills
    const skills = await db.collection("portfolioskills").find().sort({ order: 1 }).toArray();
    console.log("All Skills in Database:");
    console.log("========================");
    skills.forEach(skill => {
      console.log(`  - ${skill.name} (${skill.percent}%)`);
    });

    console.log("\n✅ Seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error seeding data:", error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log("✓ Disconnected from MongoDB");
  }
}

seedData();
