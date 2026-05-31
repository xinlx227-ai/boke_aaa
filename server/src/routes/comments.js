import prismaPkg from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { attachOptionalAuth, requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const { Prisma, CommentStatus, ArticleStatus } = prismaPkg;
const router = Router();

function formatUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role
  };
}

function rowUser(row, prefix) {
  const id = row[`${prefix}Id`];

  if (!id) {
    return null;
  }

  return {
    id: Number(id),
    username: row[`${prefix}Username`],
    role: row[`${prefix}Role`]
  };
}

function mapCommentRow(row) {
  return {
    id: Number(row.id),
    articleId: Number(row.articleId),
    userId: Number(row.userId),
    parentId: row.parentId == null ? null : Number(row.parentId),
    replyToCommentId: row.replyToCommentId == null ? null : Number(row.replyToCommentId),
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: rowUser(row, "user"),
    replyTo: row.replyToUserId
      ? {
          user: rowUser(row, "replyToUser")
        }
      : null
  };
}

function formatReply(comment) {
  return {
    id: comment.id,
    articleId: comment.articleId,
    userId: comment.userId,
    parentId: comment.parentId,
    replyToCommentId: comment.replyToCommentId,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    user: formatUser(comment.user),
    replyToUser: formatUser(comment.replyTo?.user)
  };
}

function formatRootComment(comment, likeCounts, likedCommentIds) {
  const likeCount = likeCounts.get(comment.id) || 0;

  return {
    ...formatReply(comment),
    replyToUser: null,
    likeCount,
    likedByMe: likedCommentIds.has(comment.id),
    replies: []
  };
}

function buildCommentTree(comments, likeCounts, likedCommentIds) {
  const roots = [];
  const rootById = new Map();

  for (const comment of comments) {
    if (!comment.parentId) {
      const root = formatRootComment(comment, likeCounts, likedCommentIds);
      roots.push(root);
      rootById.set(root.id, root);
    }
  }

  for (const comment of comments) {
    if (!comment.parentId) {
      continue;
    }

    const root = rootById.get(comment.parentId);

    if (root) {
      root.replies.push(formatReply(comment));
    }
  }

  return roots;
}

async function findPublishedArticleBySlug(slug) {
  return prisma.article.findFirst({
    where: {
      slug,
      status: ArticleStatus.PUBLISHED
    }
  });
}

async function findApprovedArticleComment(commentId, articleId) {
  if (!commentId) {
    return null;
  }

  const rows = await prisma.$queryRaw`
    SELECT
      c.id,
      c.article_id AS articleId,
      c.user_id AS userId,
      c.parent_id AS parentId,
      c.reply_to_comment_id AS replyToCommentId,
      c.content,
      c.status,
      c.created_at AS createdAt,
      c.updated_at AS updatedAt,
      u.id AS userId,
      u.username AS userUsername,
      u.role AS userRole,
      rtu.id AS replyToUserId,
      rtu.username AS replyToUserUsername,
      rtu.role AS replyToUserRole
    FROM comments c
    INNER JOIN users u ON u.id = c.user_id
    LEFT JOIN comments rtc ON rtc.id = c.reply_to_comment_id
    LEFT JOIN users rtu ON rtu.id = rtc.user_id
    WHERE c.id = ${commentId}
      AND c.article_id = ${articleId}
      AND c.status = ${CommentStatus.APPROVED}
    LIMIT 1
  `;

  return rows[0] ? mapCommentRow(rows[0]) : null;
}

async function getRootComment(comment, articleId) {
  if (!comment.parentId) {
    return comment;
  }

  return findApprovedArticleComment(comment.parentId, articleId);
}

async function loadRootCommentLikes(rootIds, currentUserId) {
  if (rootIds.length === 0) {
    return {
      likeCounts: new Map(),
      likedCommentIds: new Set()
    };
  }

  const likeRows = await prisma.$queryRaw`
    SELECT comment_id AS commentId, COUNT(*) AS likeCount
    FROM comment_likes
    WHERE comment_id IN (${Prisma.join(rootIds)})
    GROUP BY comment_id
  `;

  const likedRows = currentUserId
    ? await prisma.$queryRaw`
        SELECT comment_id AS commentId
        FROM comment_likes
        WHERE user_id = ${currentUserId}
          AND comment_id IN (${Prisma.join(rootIds)})
      `
    : [];

  return {
    likeCounts: new Map(likeRows.map((item) => [Number(item.commentId), Number(item.likeCount)])),
    likedCommentIds: new Set(likedRows.map((item) => Number(item.commentId)))
  };
}

router.get("/articles/:slug", attachOptionalAuth, async (req, res, next) => {
  try {
    const article = await findPublishedArticleBySlug(req.params.slug);

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const commentRows = await prisma.$queryRaw`
      SELECT
        c.id,
        c.article_id AS articleId,
        c.user_id AS userId,
        c.parent_id AS parentId,
        c.reply_to_comment_id AS replyToCommentId,
        c.content,
        c.status,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt,
        u.id AS userId,
        u.username AS userUsername,
        u.role AS userRole,
        rtu.id AS replyToUserId,
        rtu.username AS replyToUserUsername,
        rtu.role AS replyToUserRole
      FROM comments c
      INNER JOIN users u ON u.id = c.user_id
      LEFT JOIN comments rtc ON rtc.id = c.reply_to_comment_id
      LEFT JOIN users rtu ON rtu.id = rtc.user_id
      WHERE c.article_id = ${article.id}
        AND c.status = ${CommentStatus.APPROVED}
      ORDER BY c.created_at ASC, c.id ASC
    `;
    const comments = commentRows.map(mapCommentRow);
    const rootIds = comments.filter((comment) => !comment.parentId).map((comment) => comment.id);
    const { likeCounts, likedCommentIds } = await loadRootCommentLikes(rootIds, req.auth?.userId || null);

    return res.json({
      comments: buildCommentTree(comments, likeCounts, likedCommentIds),
      count: comments.length
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
    const rawParentId = req.body?.parentId == null ? null : Number(req.body.parentId);
    const rawReplyToCommentId =
      req.body?.replyToCommentId == null ? null : Number(req.body.replyToCommentId);
    const parentId = Number.isInteger(rawParentId) && rawParentId > 0 ? rawParentId : null;
    const replyToCommentId =
      Number.isInteger(rawReplyToCommentId) && rawReplyToCommentId > 0 ? rawReplyToCommentId : null;

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

    let rootComment = null;
    let replyTarget = null;

    if (parentId || replyToCommentId) {
      replyTarget = await findApprovedArticleComment(replyToCommentId || parentId, article.id);

      if (!replyTarget) {
        return res.status(400).json({
          message: "回复的评论无效。"
        });
      }

      rootComment = await getRootComment(replyTarget, article.id);

      if (!rootComment) {
        return res.status(400).json({
          message: "回复的评论无效。"
        });
      }

      if (parentId && parentId !== rootComment.id) {
        return res.status(400).json({
          message: "回复的主评论无效。"
        });
      }
    }

    const commentId = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO comments (
          article_id,
          user_id,
          parent_id,
          reply_to_comment_id,
          content,
          status,
          created_at,
          updated_at
        )
        VALUES (
          ${article.id},
          ${req.auth.userId},
          ${rootComment?.id || null},
          ${replyTarget?.id || null},
          ${content},
          ${CommentStatus.APPROVED},
          CURRENT_TIMESTAMP(3),
          CURRENT_TIMESTAMP(3)
        )
      `;
      const rows = await tx.$queryRaw`SELECT LAST_INSERT_ID() AS id`;
      return Number(rows[0].id);
    });
    const comment = await findApprovedArticleComment(commentId, article.id);

    return res.status(201).json({
      comment: comment.parentId
        ? formatReply(comment)
        : formatRootComment(comment, new Map([[comment.id, 0]]), new Set())
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/likes", requireAuth, async (req, res, next) => {
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

    if (!comment || comment.status !== CommentStatus.APPROVED) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    if (comment.parentId) {
      return res.status(400).json({
        message: "回复暂不支持点赞。"
      });
    }

    if (comment.userId === req.auth.userId) {
      return res.status(403).json({
        message: "不能点赞自己的评论。"
      });
    }

    const result = await prisma.$executeRaw`
      INSERT IGNORE INTO comment_likes (comment_id, user_id, created_at)
      VALUES (${comment.id}, ${req.auth.userId}, CURRENT_TIMESTAMP(3))
    `;
    const [{ likeCount }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS likeCount
      FROM comment_likes
      WHERE comment_id = ${comment.id}
    `;

    return res.json({
      changed: Number(result) > 0,
      likeCount: Number(likeCount),
      likedByMe: true
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id/likes", requireAuth, async (req, res, next) => {
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

    if (!comment || comment.status !== CommentStatus.APPROVED) {
      return res.status(404).json({
        message: "评论不存在。"
      });
    }

    if (comment.parentId) {
      return res.status(400).json({
        message: "回复暂不支持点赞。"
      });
    }

    const result = await prisma.$executeRaw`
      DELETE FROM comment_likes
      WHERE comment_id = ${comment.id}
        AND user_id = ${req.auth.userId}
    `;
    const [{ likeCount }] = await prisma.$queryRaw`
      SELECT COUNT(*) AS likeCount
      FROM comment_likes
      WHERE comment_id = ${comment.id}
    `;

    return res.json({
      changed: Number(result) > 0,
      likeCount: Number(likeCount),
      likedByMe: false
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

    await prisma.$transaction(async (tx) => {
      if (!comment.parentId) {
        await tx.comment.deleteMany({
          where: {
            parentId: comment.id
          }
        });
      }

      await tx.comment.delete({
        where: {
          id: comment.id
        }
      });
    });

    return res.json({
      ok: true
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
