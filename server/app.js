import { randomBytes } from "node:crypto";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import mongoose from "mongoose";
import { connectDatabase, ensureInitialPortfolio } from "./database.js";
import { AdminUser, ContactMessage, Profile, Project, Skill } from "./models.js";
import {
  createSlug,
  hasValidCsrfToken,
  limitRequests,
  passwordHashFormatIsValid,
  validOrigin,
  verifyPassword
} from "./security.js";

const app = express();
const router = express.Router();
const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};
const csrf = (req, res, next) => {
  if (!validOrigin(req)) {
    return res.status(403).json({ error: "This request origin is not allowed." });
  }
  if (!hasValidCsrfToken(req)) {
    return res.status(403).json({ error: "Your session has expired. Please sign in again." });
  }
  next();
};
const sameOrigin = (req, res, next) => {
  if (!validOrigin(req)) {
    return res.status(403).json({ error: "This request origin is not allowed." });
  }
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.session?.admin) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  next();
};

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", "https://www.google-analytics.com", "https://www.googletagmanager.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://unpkg.com"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      frameSrc: ["https://www.google.com", "https://maps.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: "20kb", type: "application/json" }));

let sessionStore;

function isAdminConfigured() {
  if (!process.env.ADMIN_USERNAME || !process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET.length < 32 ||
      !passwordHashFormatIsValid(process.env.ADMIN_PASSWORD_HASH) ||
      !process.env.APP_ORIGINS && !process.env.APP_ORIGIN) {
    return false;
  }
  const origins = (process.env.APP_ORIGINS || process.env.APP_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 && origins.every((value) => {
    try {
      const origin = new URL(value);
      return origin.origin === value &&
        (origin.protocol === "https:" ||
          (origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)));
    } catch {
      return false;
    }
  });
}

const initializeRequest = asyncRoute(async (req, res, next) => {
  try {
    await connectDatabase();
  } catch (error) {
    logDatabaseConnectionFailure(error);
    return res.status(503).json({ error: "The portfolio service is temporarily unavailable." });
  }

  try {
    if (!sessionStore) {
      sessionStore = MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "portfolio_sessions",
        ttl: 60 * 60 * 8,
        autoRemove: "native"
      });
    }
    session({
      name: "portfolio.sid",
      secret: process.env.SESSION_SECRET || "missing-session-secret-configure-before-use",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1",
        maxAge: 8 * 60 * 60 * 1000
      }
    })(req, res, next);
  } catch {
    console.error("Portfolio session initialization failed.");
    return res.status(503).json({ error: "The portfolio service is temporarily unavailable." });
  }
});

function safeProfile(profile) {
  if (!profile) {
    return null;
  }
  const { _id, ...data } = profile;
  return data;
}

function validWebUrl(value, allowLocalImage = false) {
  if (typeof value !== "string" || value.length > 500) {
    return false;
  }
  if (allowLocalImage && /^\/images\/[a-zA-Z0-9._%() -]+$/.test(value)) {
    return true;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function parseOrder(value) {
  const order = Number(value);
  return Number.isInteger(order) && order >= 0 && order <= 10000 ? order : null;
}

function publicError(res, error) {
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return res.status(400).json({ error: "Please check the submitted values and try again." });
  }
  if (error?.code === 11000) {
    return res.status(409).json({ error: "An item with that name already exists." });
  }
  console.error("Portfolio API operation failed.");
  return res.status(500).json({ error: "The request could not be completed." });
}

function logDatabaseConnectionFailure(error) {
  const message = error instanceof Error
    ? error.message.replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "mongodb+srv://[redacted]")
    : "Unknown database connection error.";
  console.error("Portfolio database connection failed.", {
    name: error instanceof Error ? error.name : "UnknownError",
    code: error?.code,
    message
  });
}

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/portfolio", asyncRoute(async (req, res) => {
  await ensureInitialPortfolio();
  const [profile, skills, projects] = await Promise.all([
    Profile.findById("owner-profile").lean(),
    Skill.find().sort({ order: 1, name: 1 }).lean(),
    Project.find().sort({ order: 1, title: 1 }).lean()
  ]);
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({
    profile: safeProfile(profile),
    skills: skills.map(({ _id, name, percent, order }) => ({ id: _id, name, percent, order })),
    projects: projects.map(({ _id, ...project }) => ({ id: _id, ...project }))
  });
}));

router.post("/contact", sameOrigin, asyncRoute(async (req, res) => {
  if (req.body?.website) {
    return res.status(201).json({ message: "Thanks for your message." });
  }
  if (!await limitRequests(req, "contact", 5, 60 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many messages. Please try again later." });
  }

  const { name, email, phone = "", message } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80 ||
      typeof email !== "string" || email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof phone !== "string" || phone.length > 40 ||
      typeof message !== "string" || !message.trim() || message.trim().length > 3000) {
    return res.status(400).json({ error: "Please complete each field with valid information." });
  }

  await ContactMessage.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
    message: message.trim()
  });
  res.status(201).json({ message: "Thanks for your message. I'll be in touch soon." });
}));

router.post("/admin/login", asyncRoute(async (req, res) => {
  if (!isAdminConfigured()) {
    return res.status(503).json({ error: "Admin authentication is not configured." });
  }
  if (!validOrigin(req)) {
    return res.status(403).json({ error: "This request origin is not allowed." });
  }
  if (!await limitRequests(req, "login", 8, 15 * 60 * 1000)) {
    return res.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
  }

  const username = typeof req.body?.username === "string" ? req.body.username : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const usernameMatches = username.length <= 100 &&
    username === process.env.ADMIN_USERNAME;
  const passwordMatches = password.length <= 1024 &&
    verifyPassword(password, process.env.ADMIN_PASSWORD_HASH);
  if (!usernameMatches || !passwordMatches) {
    return res.status(401).json({ error: "The username or password is incorrect." });
  }

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
  req.session.admin = true;
  req.session.csrfToken = randomBytes(32).toString("hex");
  res.json({ username: process.env.ADMIN_USERNAME, csrfToken: req.session.csrfToken });
}));

router.get("/admin/session", requireAdmin, (req, res) => {
  if (!isAdminConfigured()) {
    return res.status(503).json({ error: "Admin authentication is not configured." });
  }
  res.set("Cache-Control", "no-store");
  res.json({ username: process.env.ADMIN_USERNAME, csrfToken: req.session.csrfToken });
});

router.post("/admin/logout", requireAdmin, csrf, asyncRoute(async (req, res) => {
  await new Promise((resolve, reject) => {
    req.session.destroy((error) => error ? reject(error) : resolve());
  });
  res.clearCookie("portfolio.sid", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
  });
  res.status(204).end();
}));

router.get("/admin/portfolio", requireAdmin, asyncRoute(async (req, res) => {
  if (!isAdminConfigured()) {
    return res.status(503).json({ error: "Admin authentication is not configured." });
  }
  await ensureInitialPortfolio();
  const [profile, skills, projects] = await Promise.all([
    Profile.findById("owner-profile").lean(),
    Skill.find().sort({ order: 1, name: 1 }).lean(),
    Project.find().sort({ order: 1, title: 1 }).lean()
  ]);
  res.set("Cache-Control", "no-store");
  res.json({
    profile: safeProfile(profile),
    skills: skills.map(({ _id, ...skill }) => ({ id: _id, ...skill })),
    projects: projects.map(({ _id, ...project }) => ({ id: _id, ...project }))
  });
}));

router.put("/admin/profile", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const fields = [
    "name", "role", "bio", "age", "gender", "languages", "email",
    "work", "freelance", "phone", "country", "experienceYears",
    "projectCount", "clientCount"
  ];
  const profile = Object.fromEntries(fields
    .filter((field) => Object.hasOwn(req.body || {}, field))
    .map((field) => [field, req.body[field]]));
  if (Object.keys(profile).length !== fields.length) {
    return res.status(400).json({ error: "Please provide all profile fields." });
  }

  const updated = await Profile.findByIdAndUpdate(
    "owner-profile",
    { $set: profile },
    { new: true, runValidators: true }
  ).lean();
  res.json({ profile: safeProfile(updated) });
}));

router.post("/admin/skills", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const { name, percent, order = 0 } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const parsedPercent = Number(percent);
  const parsedOrder = parseOrder(order);
  if (!normalizedName || normalizedName.length > 60 || !Number.isInteger(parsedPercent) ||
      parsedPercent < 0 || parsedPercent > 100 || parsedOrder === null) {
    return res.status(400).json({ error: "Enter a skill name and a whole-number percentage from 0 to 100." });
  }
  const skill = await Skill.create({
    _id: createSlug(normalizedName),
    name: normalizedName,
    percent: parsedPercent,
    order: parsedOrder
  });
  res.status(201).json({ skill: { id: skill._id, name: skill.name, percent: skill.percent, order: skill.order } });
}));

router.put("/admin/skills/:id", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const { name, percent, order = 0 } = req.body || {};
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const parsedPercent = Number(percent);
  const parsedOrder = parseOrder(order);
  if (!normalizedName || normalizedName.length > 60 || !Number.isInteger(parsedPercent) ||
      parsedPercent < 0 || parsedPercent > 100 || parsedOrder === null) {
    return res.status(400).json({ error: "Enter a skill name and a whole-number percentage from 0 to 100." });
  }
  const skill = await Skill.findByIdAndUpdate(req.params.id, {
    $set: { name: normalizedName, percent: parsedPercent, order: parsedOrder }
  }, { new: true, runValidators: true }).lean();
  if (!skill) {
    return res.status(404).json({ error: "Skill not found." });
  }
  res.json({ skill: { id: skill._id, name: skill.name, percent: skill.percent, order: skill.order } });
}));

router.delete("/admin/skills/:id", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const result = await Skill.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: "Skill not found." });
  }
  res.status(204).end();
}));

router.post("/admin/projects", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const project = normalizeProject(req.body);
  if (project.error) {
    return res.status(400).json({ error: project.error });
  }
  const created = await Project.create({ _id: createSlug(project.title), ...project.value });
  res.status(201).json({ project: { id: created._id, ...created.toObject() } });
}));

router.put("/admin/projects/:id", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const project = normalizeProject(req.body);
  if (project.error) {
    return res.status(400).json({ error: project.error });
  }
  const updated = await Project.findByIdAndUpdate(req.params.id, {
    $set: project.value
  }, { new: true, runValidators: true }).lean();
  if (!updated) {
    return res.status(404).json({ error: "Project not found." });
  }
  res.json({ project: { id: updated._id, ...updated } });
}));

function normalizeProject(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const technologies = typeof body.technologies === "string" ? body.technologies.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const liveUrl = typeof body.liveUrl === "string" ? body.liveUrl.trim() : "";
  const sourceUrl = typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
  const order = parseOrder(body.order ?? 0);

  if (!title || title.length > 120 || !description || description.length > 1000 ||
      technologies.length > 300 || !validWebUrl(imageUrl, true) ||
      (liveUrl && !validWebUrl(liveUrl)) || (sourceUrl && !validWebUrl(sourceUrl)) ||
      order === null || !createSlug(title)) {
    return { error: "Check the project title, description, image path, links, and display order." };
  }
  return { value: { title, description, technologies, imageUrl, liveUrl, sourceUrl, order } };
}

router.delete("/admin/projects/:id", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const result = await Project.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: "Project not found." });
  }
  res.status(204).end();
}));

router.get("/admin/messages", requireAdmin, asyncRoute(async (req, res) => {
  const messages = await ContactMessage.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.set("Cache-Control", "no-store");
  res.json({ messages });
}));

router.patch("/admin/messages/:id", requireAdmin, csrf, asyncRoute(async (req, res) => {
  if (typeof req.body?.read !== "boolean") {
    return res.status(400).json({ error: "Choose whether the message has been read." });
  }
  const message = await ContactMessage.findByIdAndUpdate(req.params.id, {
    $set: { readAt: req.body.read ? new Date() : null }
  }, { new: true }).lean();
  if (!message) {
    return res.status(404).json({ error: "Message not found." });
  }
  res.json({ message });
}));

router.delete("/admin/messages/:id", requireAdmin, csrf, asyncRoute(async (req, res) => {
  const message = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!message) {
    return res.status(404).json({ error: "Message not found." });
  }
  res.status(204).end();
}));

async function ensureApiReady(req, res, next) {
  try {
    await connectDatabase();
    return next();
  } catch (error) {
    logDatabaseConnectionFailure(error);
    return res.status(503).json({ error: "The portfolio service is temporarily unavailable." });
  }
}

app.use("/api", ensureApiReady, initializeRequest, router);
app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "The submitted data is too large." });
  }
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "The request body must be valid JSON." });
  }
  return publicError(res, error);
});

export default app;
