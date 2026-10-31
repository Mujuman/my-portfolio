import mongoose from "mongoose";

const { Schema } = mongoose;

const profileSchema = new Schema({
  _id: { type: String, default: "owner-profile" },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  bio: { type: String, required: true, trim: true, maxlength: 1200 },
  age: { type: Number, min: 0, max: 120, default: 0 },
  gender: { type: String, trim: true, maxlength: 50, default: "" },
  languages: { type: String, trim: true, maxlength: 150, default: "" },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  work: { type: String, trim: true, maxlength: 120, default: "" },
  freelance: { type: String, trim: true, maxlength: 80, default: "" },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  country: { type: String, trim: true, maxlength: 100, default: "" },
  experienceYears: { type: Number, min: 0, max: 80, default: 0 },
  projectCount: { type: Number, min: 0, max: 100000, default: 0 },
  clientCount: { type: Number, min: 0, max: 100000, default: 0 }
}, { timestamps: true, versionKey: false });

const skillSchema = new Schema({
  _id: { type: String, required: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  percent: { type: Number, required: true, min: 0, max: 100, validate: Number.isInteger },
  order: { type: Number, min: 0, max: 10000, default: 0 }
}, { timestamps: true, versionKey: false });
skillSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

const projectSchema = new Schema({
  _id: { type: String, required: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  technologies: { type: String, trim: true, maxlength: 300, default: "" },
  imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
  liveUrl: { type: String, trim: true, maxlength: 500, default: "" },
  sourceUrl: { type: String, trim: true, maxlength: 500, default: "" },
  order: { type: Number, min: 0, max: 10000, default: 0 }
}, { timestamps: true, versionKey: false });

const messageSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 254,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
  readAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

const requestBucketSchema = new Schema({
  _id: { type: String, required: true },
  hits: { type: Number, required: true },
  expiresAt: { type: Date, required: true }
}, { versionKey: false });
requestBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const profileModel = (name, schema) => mongoose.models[name] || mongoose.model(name, schema);

export const Profile = profileModel("PortfolioProfile", profileSchema);
export const Skill = profileModel("PortfolioSkill", skillSchema);
export const Project = profileModel("PortfolioProject", projectSchema);
export const ContactMessage = profileModel("PortfolioContactMessage", messageSchema);
export const PortfolioState = profileModel("PortfolioState", new Schema({
  _id: String,
  complete: { type: Boolean, default: false }
}, { versionKey: false }));
export const RequestBucket = profileModel("PortfolioRequestBucket", requestBucketSchema);
