import mongoose from "mongoose";
import { defaultProfile, defaultProjects, defaultSkills } from "./defaults.js";
import { PortfolioState, Profile, Project, Skill } from "./models.js";

let connectionPromise;
let seedPromise;

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 5
    }).then(() => mongoose.connection).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}

export async function ensureInitialPortfolio() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const state = await PortfolioState.findById("initial-portfolio-v1").lean();
      if (state?.complete) {
        return;
      }

      await Promise.all([
        Profile.updateOne(
          { _id: defaultProfile._id },
          { $setOnInsert: defaultProfile },
          { upsert: true, runValidators: true }
        ),
        ...defaultSkills.map((skill) => Skill.updateOne(
          { _id: skill._id },
          { $setOnInsert: skill },
          { upsert: true, runValidators: true }
        )),
        ...defaultProjects.map((project) => Project.updateOne(
          { _id: project._id },
          { $setOnInsert: project },
          { upsert: true, runValidators: true }
        ))
      ]);

      await PortfolioState.updateOne(
        { _id: "initial-portfolio-v1" },
        { $set: { complete: true } },
        { upsert: true }
      );
    })().catch((error) => {
      seedPromise = undefined;
      throw error;
    });
  }

  return seedPromise;
}
