import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import apiRouter from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.get("/", (_req, res) => {
  res.json({
    message: "Private blog API is running."
  });
});

app.use("/api", apiRouter);

app.use((err, _req, res, _next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    message: err.statusCode ? err.message : "Internal server error."
  });
});

export default app;
