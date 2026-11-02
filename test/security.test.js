import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import test from "node:test";
import {
  createSlug,
  hasValidCsrfToken,
  passwordHashFormatIsValid,
  validOrigin,
  verifyPassword
} from "../server/security.js";
import { defaultProfile, defaultProjects, defaultSkills } from "../server/defaults.js";
import { ContactMessage, Profile, Project, Skill } from "../server/models.js";

function makeHash(password) {
  const salt = randomBytes(32);
  return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, 64).toString("hex")}`;
}

test("scrypt password hash verifies only the matching password", () => {
  const password = "a-strong-portfolio-password";
  const hash = makeHash(password);
  assert.equal(passwordHashFormatIsValid(hash), true);
  assert.equal(verifyPassword(password, hash), true);
  assert.equal(verifyPassword("incorrect-password", hash), false);
  assert.equal(passwordHashFormatIsValid(password), false);
});

test("portfolio slugs are normalized and safe for Mongo identifiers", () => {
  assert.equal(createSlug("Nida-Al-Quran"), "nida-al-quran");
  assert.equal(createSlug(" Café & Code! "), "cafe-code");
  assert.equal(createSlug("***"), "");
});

test("origin validation only accepts configured origins", () => {
  const originalOrigin = process.env.APP_ORIGIN;
  const originalOrigins = process.env.APP_ORIGINS;
  delete process.env.APP_ORIGIN;
  process.env.APP_ORIGINS = "https://portfolio.example,https://admin.example";
  const request = (origin) => ({
    get: (name) => name === "origin" ? origin : undefined,
    protocol: "https"
  });
  try {
    assert.equal(validOrigin(request("https://portfolio.example")), true);
    assert.equal(validOrigin(request("https://admin.example")), true);
    assert.equal(validOrigin(request("https://attacker.example")), false);
    assert.equal(validOrigin(request(undefined)), true);
  } finally {
    if (originalOrigins === undefined) {
      delete process.env.APP_ORIGINS;
    } else {
      process.env.APP_ORIGINS = originalOrigins;
    }
    if (originalOrigin === undefined) {
      delete process.env.APP_ORIGIN;
    } else {
      process.env.APP_ORIGIN = originalOrigin;
    }
  }
});

test("CSRF validation requires a matching, non-empty session token", () => {
  const request = (token, expected) => ({
    get: () => token,
    session: expected === undefined ? undefined : { csrfToken: expected }
  });
  assert.equal(hasValidCsrfToken(request("token", "token")), true);
  assert.equal(hasValidCsrfToken(request("wrong", "token")), false);
  assert.equal(hasValidCsrfToken(request("short", "longer")), false);
  assert.equal(hasValidCsrfToken(request(undefined, undefined)), false);
});

test("default portfolio data includes the owner's requested skills and projects", () => {
  assert.equal(defaultProfile._id, "owner-profile");
  assert.equal(defaultSkills.find(({ name }) => name === "Node.js")?.percent, 99);
  assert.equal(defaultSkills.find(({ name }) => name === "MongoDB")?.percent, 98);
  assert.equal(defaultSkills.find(({ name }) => name === "Express.js")?.percent, 90);
  assert.ok(defaultProjects.length >= 5);
  assert.equal(new Set(defaultProjects.map(({ _id }) => _id)).size, defaultProjects.length);
});

test("MongoDB models reject invalid skill ratings, project identifiers, and contact email", async () => {
  await assert.rejects(
    new Skill({ _id: "html", name: "HTML", percent: 101 }).validate(),
    { name: "ValidationError" }
  );
  await assert.rejects(
    new Project({
      _id: "Not A Safe Slug",
      title: "Test",
      description: "A test project",
      imageUrl: "/images/test.png"
    }).validate(),
    { name: "ValidationError" }
  );
  await assert.rejects(
    new ContactMessage({
      name: "Visitor",
      email: "not-an-email",
      message: "Hello"
    }).validate(),
    { name: "ValidationError" }
  );
  await assert.rejects(
    new Profile({ ...defaultProfile, email: "not-an-email" }).validate(),
    { name: "ValidationError" }
  );
});
