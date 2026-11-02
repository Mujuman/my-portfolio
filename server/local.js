import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app.js";

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(serverDirectory);
dotenv.config({ path: path.join(serverDirectory, ".env") });
const port = Number(process.env.PORT) || 3000;

app.use("/admin", express.static(path.join(root, "admin"), {
  dotfiles: "deny",
  index: "index.html"
}));
app.use(express.static(path.join(root, "frontend"), {
  dotfiles: "deny",
  index: "index.html"
}));
app.listen(port, () => {
  console.log(`Portfolio available at http://localhost:${port}`);
});
