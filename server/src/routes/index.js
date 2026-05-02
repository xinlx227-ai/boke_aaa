import { Router } from "express";
import authRouter from "./auth.js";
import articlesRouter from "./articles.js";
import commentsRouter from "./comments.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "private-blog-api",
    timestamp: new Date().toISOString()
  });
});

router.use("/auth", authRouter);
router.use("/articles", articlesRouter);
router.use("/comments", commentsRouter);

export default router;
