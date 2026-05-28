import prismaPkg from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const { CommentStatus, ArticleStatus } = prismaPkg;
const router = Router();

function formatComment(comment) {
  return {
    id: comment.id,
    articleId: comment.articleId,
    userId: comment.userId,
    parentId: comment.parentId,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: comment.user
      ? {
          id: comment.user.id,
          username: comment.user.username,
          role: comment.user.role
        }
      : null
  };
}

async function findPublishedArticleBySlug(slug) {
  return prisma.article.findFirst({
    where: {
      slug,
      status: ArticleStatus.PUBLISHED
    }
  });
}

router.get("/articles/:slug", async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug);

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const comments = await prisma.comment.findMany({
      where: {
        articleId: article.id,
        status: CommentStatus.APPROVED
      },
      orderBy: {
        createdAt: "asc"
      },
      include: {
        user: true
      }
    });

    return res.json({
      comments: comments.map(formatComment)
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/articles/:slug", requireAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug);

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const content = String(req.body?.content || "").trim();
    const parentId = req.body?.parentId == null ? null : Number(req.body.parentId);

    if (!content) {
      return res.status(400).json({
        message: "请输入评论内容。"
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        message: "评论内容不能超过 2000 个字符。"
      });
    }

    if (parentId) {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: parentId,
          articleId: article.id,
          status: CommentStatus.APPROVED
        }
      });

      if (!parentComment) {
        return res.status(400).json({
          message: "回复的评论无效。"
        });
      }
    }

    const comment = await prisma.comment.create({
      data: {
        articleId: article.id,
        userId: req.auth.userId,
        parentId: parentId || null,
        content,
        status: CommentStatus.APPROVED
      },
      include: {
        user: true
      }
    });

    return res.status(201).json({
      comment: formatComment(comment)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);

    if (!commentId) {
      return res.status(400).json({
        message: "评论 ID 无效。"
      });
    }

    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId
      }
    });

    if (!comment) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    await prisma.comment.delete({
      where: {
        id: commentId
      }
    });

    return res.json({
      ok: true
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
