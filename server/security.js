import { createHash, scryptSync, timingSafeEqual } from "node:crypto";
import { RequestBucket } from "./models.js";

export function verifyPassword(password, encodedHash) {
  const [algorithm, salt, hash] = String(encodedHash || "").split("$");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32,128}$/i.test(salt || "") || !/^[a-f0-9]{128}$/i.test(hash || "")) {
    return false;
  }

  const derived = scryptSync(password, Buffer.from(salt, "hex"), 64);
  const expectedKey = Buffer.from(hash, "hex");
  return derived.length === expectedKey.length && timingSafeEqual(derived, expectedKey);
}

export function passwordHashFormatIsValid(encodedHash) {
  const [algorithm, salt, hash] = String(encodedHash || "").split("$");
  return algorithm === "scrypt" &&
    /^[a-f0-9]{32,128}$/i.test(salt || "") &&
    /^[a-f0-9]{128}$/i.test(hash || "");
}

function requestIdentity(req) {
  const address = req.ip || req.socket.remoteAddress || "unknown";
  const secret = process.env.SESSION_SECRET || "missing-session-secret";
  return createHash("sha256").update(`${secret}:${address}`).digest("hex");
}

export async function limitRequests(req, scope, limit, windowMs) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);
  const bucket = await RequestBucket.findOneAndUpdate(
    { _id: `${scope}:${requestIdentity(req)}` },
    [{
      $set: {
        hits: {
          $cond: [
            { $gt: ["$expiresAt", now] },
            { $add: [{ $ifNull: ["$hits", 0] }, 1] },
            1
          ]
        },
        expiresAt: {
          $cond: [
            { $gt: ["$expiresAt", now] },
            "$expiresAt",
            expiresAt
          ]
        }
      }
    }],
    { upsert: true, new: true, lean: true }
  );
  return bucket.hits <= limit;
}

export function validOrigin(req) {
  const origin = req.get("origin");
  if (!origin) {
    return true;
  }

  try {
    const requestOrigin = new URL(origin).origin;
    const configuredOrigins = (process.env.APP_ORIGINS || process.env.APP_ORIGIN || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (configuredOrigins.length) {
      return configuredOrigins.some((value) => {
        try {
          return new URL(value).origin === requestOrigin && new URL(value).origin === value;
        } catch {
          return false;
        }
      });
    }
    const expected = `${req.protocol}://${req.get("x-forwarded-host") || req.get("host")}`;
    return requestOrigin === new URL(expected).origin;
  } catch {
    return false;
  }
}

export function hasValidCsrfToken(req) {
  const supplied = req.get("x-csrf-token");
  const expected = req.session?.csrfToken;
  if (typeof supplied !== "string" || typeof expected !== "string") {
    return false;
  }

  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSlug(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
