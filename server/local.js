import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT) || 3000;

app.use(express.static(root, { dotfiles: "deny", index: "index.html" }));
app.listen(port, () => {
  console.log(`Portfolio available at http://localhost:${port}`);
});
