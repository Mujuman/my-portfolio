import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const terminal = createInterface({ input: stdin, output: stdout });
try {
  const password = await terminal.question("Choose a strong admin password (minimum 12 characters): ");
  if (password.length < 12 || password.length > 1024) {
    throw new Error("The password must be between 12 and 1024 characters.");
  }
  const salt = randomBytes(32);
  const hash = scryptSync(password, salt, 64);
  console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
} finally {
  terminal.close();
}
