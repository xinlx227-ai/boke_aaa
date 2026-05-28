import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import multer from "multer";
import prismaPkg from "@prisma/client";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { renderMarkdownToSafeHtml, renderMarkdownToSafeHtmlWithToc } from "../lib/markdown.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const { Prisma, ArticleStatus } = prismaPkg;
const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, "../../uploads/articles");

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeTagNames(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeName).filter(Boolean))).slice(0, 20);
  }

  return String(value || "")
    .split(",")
    .map(normalizeName)
    .filter(Boolean)
    .slice(0, 20);
}

function normalizeZipPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
}

function isMarkdownPath(value) {
  return /\.md$/i.test(value);
}

function isSupportedImagePath(value) {
  return /\.(png|jpe?g|gif|webp)$/i.test(value);
}

function stripMarkdownExtension(value) {
  return String(value || "").replace(/\.md$/i, "");
}

function titleFromMarkdownFile(entryName, contentMarkdown) {
  const heading = String(contentMarkdown || "").match(/^#\s+(.+)$/m)?.[1]?.trim();

  if (heading) {
    return heading.slice(0, 200);
  }

  const baseName = stripMarkdownExtension(path.posix.basename(entryName));
  const title = baseName.replace(/^\d+[-_.\s]*/, "").trim() || baseName;
  return title.slice(0, 200);
}

function slugFromMarkdownFile(entryName) {
  const baseName = stripMarkdownExtension(path.posix.basename(entryName));
  return slugify(baseName);
}

function parseChapterOrder(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.trunc(parsed);
}

function hasExplicitChapterOrder(input) {
  return input && Object.prototype.hasOwnProperty.call(input, "chapterOrder") && input.chapterOrder !== "";
}

async function nextArticleChapterOrder() {
  return (await prisma.article.count()) + 1;
}

function clampChapterOrder(value, maxOrder) {
  const parsed = parseChapterOrder(value);

  if (parsed < 1) {
    return 1;
  }

  return Math.min(parsed, maxOrder);
}

async function moveArticleToChapterOrder(articleId, requestedOrder) {
  await prisma.$transaction(async (tx) => {
    const articles = await tx.article.findMany({
      select: {
        id: true,
        chapterOrder: true
      },
      orderBy: [
        {
          chapterOrder: "asc"
        },
        {
          id: "asc"
        }
      ]
    });
    const movedArticle = articles.find((article) => article.id === articleId);

    if (!movedArticle) {
      return;
    }

    const targetIndex = clampChapterOrder(requestedOrder, articles.length) - 1;
    const orderedArticles = articles.filter((article) => article.id !== articleId);
    orderedArticles.splice(targetIndex, 0, movedArticle);

    await Promise.all(
      orderedArticles.map((article, index) =>
        tx.article.update({
          where: {
            id: article.id
          },
          data: {
            chapterOrder: index + 1
          }
        })
      )
    );
  });
}

function sanitizeFilename(name) {
  return String(name || "image")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
}

function formatArticle(article) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    contentMarkdown: article.contentMarkdown,
    contentHtml: article.contentHtml,
    chapterOrder: article.chapterOrder,
    status: article.status,
    publishedAt: article.publishedAt,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    category: article.category
      ? {
          id: article.category.id,
          name: article.category.name,
          slug: article.category.slug
        }
      : null,
    tags: Array.isArray(article.tags)
      ? article.tags.map((articleTag) => ({
          id: articleTag.tag.id,
          name: articleTag.tag.name,
          slug: articleTag.tag.slug
        }))
      : [],
    toc: Array.isArray(article.toc) ? article.toc : [],
    author: article.author
      ? {
          id: article.author.id,
          username: article.author.username,
          email: article.author.email,
          role: article.author.role
        }
      : null,
    images: Array.isArray(article.images)
      ? article.images.map((image) => ({
          id: image.id,
          imageUrl: image.imageUrl,
          altText: image.altText,
          sortOrder: image.sortOrder,
          createdAt: image.createdAt,
          updatedAt: image.updatedAt
        }))
      : []
  };
}

function articleTimelineValue(article) {
  const time = new Date(article?.publishedAt || article?.createdAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function sortByPublishedTime(articles) {
  return [...articles].sort((firstArticle, secondArticle) => {
    const timeDiff = articleTimelineValue(secondArticle) - articleTimelineValue(firstArticle);

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return (secondArticle.id || 0) - (firstArticle.id || 0);
  });
}

function isMissingPublishedAtColumnError(error) {
  const message = `${error?.message || ""} ${error?.meta?.message || ""}`;
  return message.includes("published_at") && (message.includes("Unknown column") || message.includes("no such column"));
}

async function withArticlePublishTimes(articles) {
  if (articles.length === 0) {
    return articles;
  }

  try {
    const rows = await prisma.$queryRaw`
      SELECT id, published_at AS publishedAt
      FROM articles
      WHERE id IN (${Prisma.join(articles.map((article) => article.id))})
    `;
    const publishTimesById = new Map(rows.map((row) => [Number(row.id), row.publishedAt]));

    return articles.map((article) => ({
      ...article,
      publishedAt: publishTimesById.get(article.id) || null
    }));
  } catch (error) {
    if (isMissingPublishedAtColumnError(error)) {
      return articles;
    }

    throw error;
  }
}

async function setPublishedAtIfMissing(articleId) {
  try {
    await prisma.$executeRaw`
      UPDATE articles
      SET published_at = COALESCE(published_at, CURRENT_TIMESTAMP(3))
      WHERE id = ${articleId}
    `;
  } catch (error) {
    if (!isMissingPublishedAtColumnError(error)) {
      throw error;
    }
  }
}

function buildArticleData(input) {
  const title = String(input?.title || "").trim();
  const requestedSlug = String(input?.slug || "").trim();
  const slug = slugify(requestedSlug || title);
  const contentMarkdown = String(input?.contentMarkdown || "");
  const rendered = renderMarkdownToSafeHtmlWithToc(contentMarkdown);
  const chapterOrder = hasExplicitChapterOrder(input) ? parseChapterOrder(input.chapterOrder) : null;
  const categoryName = normalizeName(input?.categoryName);
  const tagNames = normalizeTagNames(input?.tagNames ?? input?.tags);

  if (!title) {
    return {
      error: "请输入文章标题。"
    };
  }

  if (!slug) {
    return {
      error: "无法根据标题生成有效的 Slug。"
    };
  }

  if (title.length > 200) {
    return {
      error: "文章标题不能超过 200 个字符。"
    };
  }

  if (slug.length > 220) {
    return {
      error: "Slug 不能超过 220 个字符。"
    };
  }

  return {
    data: {
      title,
      slug,
      contentMarkdown,
      contentHtml: rendered.html,
      ...(chapterOrder === null ? {} : { chapterOrder }),
      categoryName,
      tagNames
    },
    toc: rendered.toc
  };
}

async function upsertCategoryByName(name) {
  const categoryName = normalizeName(name);

  if (!categoryName) {
    return null;
  }

  const slug = slugify(categoryName);

  return prisma.category.upsert({
    where: {
      slug
    },
    create: {
      name: categoryName,
      slug
    },
    update: {
      name: categoryName
    }
  });
}

async function upsertTagsByNames(names) {
  const tagNames = normalizeTagNames(names);

  return Promise.all(
    tagNames.map((name) => {
      const slug = slugify(name);

      return prisma.tag.upsert({
        where: {
          slug
        },
        create: {
          name,
          slug
        },
        update: {
          name
        }
      });
    })
  );
}

async function buildArticleRelations(input) {
  const category = await upsertCategoryByName(input.categoryName);
  const tags = await upsertTagsByNames(input.tagNames);

  return {
    categoryId: category?.id ?? null,
    tagIds: tags.map((tag) => tag.id)
  };
}

async function replaceArticleTags(articleId, tagIds) {
  await prisma.articleTag.deleteMany({
    where: {
      articleId
    }
  });

  if (tagIds.length === 0) {
    return;
  }

  await prisma.articleTag.createMany({
    data: tagIds.map((tagId) => ({
      articleId,
      tagId
    })),
    skipDuplicates: true
  });
}

function articleInclude() {
  return {
    author: true,
    category: true,
    tags: {
      include: {
        tag: true
      },
      orderBy: {
        tag: {
          name: "asc"
        }
      }
    },
    images: {
      orderBy: {
        sortOrder: "asc"
      }
    }
  };
}

function buildPublicArticleWhere(query) {
  const search = String(query?.q || query?.search || "").trim();
  const category = String(query?.category || "").trim();
  const tag = String(query?.tag || "").trim();

  return {
    status: ArticleStatus.PUBLISHED,
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search
              }
            },
            {
              contentMarkdown: {
                contains: search
              }
            }
          ]
        }
      : {}),
    ...(category
      ? {
          category: {
            slug: category
          }
        }
      : {}),
    ...(tag
      ? {
          tags: {
            some: {
              tag: {
                slug: tag
              }
            }
          }
        }
      : {})
  };
}

async function ensureArticleExists(articleId) {
  return prisma.article.findUnique({
    where: {
      id: articleId
    }
  });
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, _file, callback) {
      const articleId = Number(req.params.id);
      const destination = path.join(uploadsRoot, String(articleId));
      fs.mkdirSync(destination, { recursive: true });
      callback(null, destination);
    },
    filename(_req, file, callback) {
      const extension = path.extname(file.originalname) || ".png";
      const baseName = sanitizeFilename(path.basename(file.originalname, extension));
      callback(null, `${Date.now()}-${baseName}${extension.toLowerCase()}`);
    }
  }),
  fileFilter(_req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("只支持上传图片文件。"));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, callback) {
    const isZip =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      /\.zip$/i.test(file.originalname);

    if (!isZip) {
      callback(new Error("只支持上传 zip 压缩包。"));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: 20 * 1024 * 1024
  }
});

function collectZipEntries(zip) {
  const markdownEntries = [];
  const imageEntries = new Map();
  const formatErrors = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) {
      continue;
    }

    const entryName = normalizeZipPath(entry.entryName);

    if (!entryName || entryName.includes("../")) {
      formatErrors.push({
        file: entry.entryName,
        reason: "压缩包路径无效。"
      });
      continue;
    }

    if (isMarkdownPath(entryName)) {
      markdownEntries.push({
        entry,
        entryName
      });
      continue;
    }

    if (isSupportedImagePath(entryName)) {
      imageEntries.set(entryName.toLowerCase(), {
        entry,
        entryName
      });
      continue;
    }

    formatErrors.push({
      file: entryName,
      reason: "文件类型不支持，只能导入 .md 文件和常见图片文件。"
    });
  }

  markdownEntries.sort((left, right) =>
    left.entryName.localeCompare(right.entryName, "zh-Hans-CN", {
      numeric: true,
      sensitivity: "base"
    })
  );

  return {
    markdownEntries,
    imageEntries,
    formatErrors
  };
}

async function importArticleImages({ articleId, contentMarkdown, imageEntries, missingImages }) {
  const articleDirectory = path.join(uploadsRoot, String(articleId));
  const imageRecords = new Map();

  const rewrittenMarkdown = String(contentMarkdown || "").replace(
    /(!\[[^\]]*]\()([^)\s]+)(\))/g,
    (match, prefix, imagePath, suffix) => {
      if (/^(https?:)?\/\//i.test(imagePath) || imagePath.startsWith("/uploads/")) {
        return match;
      }

      const normalizedImagePath = normalizeZipPath(decodeURIComponent(imagePath));
      const imageEntry = imageEntries.get(normalizedImagePath.toLowerCase());

      if (!imageEntry) {
        missingImages.push({
          articleId,
          path: normalizedImagePath
        });
        return match;
      }

      const existingImage = imageRecords.get(normalizedImagePath);

      if (existingImage) {
        return `${prefix}${existingImage.imageUrl}${suffix}`;
      }

      fs.mkdirSync(articleDirectory, { recursive: true });
      const safeFileName = `${Date.now()}-${imageRecords.size + 1}-${sanitizeFilename(
        path.posix.basename(imageEntry.entryName)
      )}`;
      const destination = path.join(articleDirectory, safeFileName);
      fs.writeFileSync(destination, imageEntry.entry.getData());

      const imageUrl = `/uploads/articles/${articleId}/${safeFileName}`;
      imageRecords.set(normalizedImagePath, {
        imageUrl,
        altText: null,
        sortOrder: imageRecords.size
      });

      return `${prefix}${imageUrl}${suffix}`;
    }
  );

  if (imageRecords.size > 0) {
    await prisma.articleImage.createMany({
      data: Array.from(imageRecords.values()).map((image) => ({
        articleId,
        imageUrl: image.imageUrl,
        altText: image.altText,
        sortOrder: image.sortOrder
      }))
    });
  }

  return rewrittenMarkdown;
}

router.get("/", async (req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: buildPublicArticleWhere(req.query),
      orderBy: [
        {
          createdAt: "desc"
        },
        {
          id: "desc"
        }
      ],
      include: articleInclude()
    });
    const articlesWithPublishTimes = await withArticlePublishTimes(articles);

    return res.json({
      articles: sortByPublishedTime(articlesWithPublishTimes).map(formatArticle)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/filters", async (_req, res, next) => {
  try {
    const [categories, tags] = await Promise.all([
      prisma.category.findMany({
        orderBy: {
          name: "asc"
        }
      }),
      prisma.tag.findMany({
        orderBy: {
          name: "asc"
        }
      })
    ]);

    return res.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug
      })),
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug
      }))
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin/list", requireAuth, requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: [
        {
          chapterOrder: "asc"
        },
        {
          id: "asc"
        }
      ],
      include: articleInclude()
    });

    return res.json({
      articles: articles.map(formatArticle)
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const article = await prisma.article.findFirst({
      where: {
        slug: req.params.slug,
        status: ArticleStatus.PUBLISHED
      },
      include: articleInclude()
    });

    if (!article) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    return res.json({
      article: formatArticle({
        ...article,
        toc: renderMarkdownToSafeHtmlWithToc(article.contentMarkdown).toc
      })
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/admin/import",
  requireAuth,
  requireRole("ADMIN"),
  importUpload.single("archive"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "请选择要导入的 zip 文件。"
        });
      }

      let zip;

      try {
        zip = new AdmZip(req.file.buffer);
      } catch (_error) {
        return res.status(400).json({
          message: "上传的文件不是有效的 zip 压缩包。"
        });
      }

      const { markdownEntries, imageEntries, formatErrors } = collectZipEntries(zip);
      const imported = [];
      const failed = [];
      const missingImages = [];

      for (const [index, markdownEntry] of markdownEntries.entries()) {
        let articleId = null;

        try {
          const contentMarkdown = markdownEntry.entry.getData().toString("utf8");
          const title = titleFromMarkdownFile(markdownEntry.entryName, contentMarkdown);
          const slug = slugFromMarkdownFile(markdownEntry.entryName) || `article-${index + 1}`;

          if (!title) {
            failed.push({
              file: markdownEntry.entryName,
              reason: "无法从 Markdown 文件生成标题。"
            });
            continue;
          }

          const article = await prisma.article.create({
            data: {
              authorId: req.auth.userId,
              title,
              slug,
              contentMarkdown,
              contentHtml: renderMarkdownToSafeHtml(contentMarkdown),
              chapterOrder: await nextArticleChapterOrder(),
              status: ArticleStatus.DRAFT
            }
          });
          articleId = article.id;

          const rewrittenMarkdown = await importArticleImages({
            articleId,
            contentMarkdown,
            imageEntries,
            missingImages
          });

          const updatedArticle = await prisma.article.update({
            where: {
              id: articleId
            },
            data: {
              contentMarkdown: rewrittenMarkdown,
              contentHtml: renderMarkdownToSafeHtml(rewrittenMarkdown)
            },
            include: articleInclude()
          });

          imported.push({
            file: markdownEntry.entryName,
            article: formatArticle(updatedArticle)
          });
        } catch (error) {
          if (articleId) {
            await prisma.article.delete({
              where: {
                id: articleId
              }
            });

            const articleDirectory = path.join(uploadsRoot, String(articleId));

            if (fs.existsSync(articleDirectory)) {
              fs.rmSync(articleDirectory, { recursive: true, force: true });
            }
          }

          const reason =
            error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
              ? "该 Slug 的文章已存在。"
              : error.message || "文章导入失败。";

          failed.push({
            file: markdownEntry.entryName,
            reason
          });
        }
      }

      return res.status(201).json({
        imported,
        missingImages,
        formatErrors,
        failed,
        summary: {
          imported: imported.length,
          missingImages: missingImages.length,
          formatErrors: formatErrors.length,
          failed: failed.length
        }
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post("/admin", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const built = buildArticleData(req.body);

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const requestedChapterOrder = articleData.chapterOrder ?? (await nextArticleChapterOrder());
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    const article = await prisma.article.create({
      data: {
        ...articleData,
        chapterOrder: requestedChapterOrder,
        categoryId: relations.categoryId,
        authorId: req.auth.userId,
        status: ArticleStatus.DRAFT
      },
      include: articleInclude()
    });

    await replaceArticleTags(article.id, relations.tagIds);
    await moveArticleToChapterOrder(article.id, requestedChapterOrder);

    const articleWithTags = await prisma.article.findUnique({
      where: {
        id: article.id
      },
      include: articleInclude()
    });

    return res.status(201).json({
      article: formatArticle(articleWithTags)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "该 Slug 的文章已存在。"
      });
    }

    return next(error);
  }
});

router.patch("/admin/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const built = buildArticleData(req.body);

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const requestedChapterOrder = articleData.chapterOrder ?? existingArticle.chapterOrder;
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    await replaceArticleTags(articleId, relations.tagIds);

    await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        ...articleData,
        categoryId: relations.categoryId
      },
      include: articleInclude()
    });
    await moveArticleToChapterOrder(articleId, requestedChapterOrder);

    const article = await prisma.article.findUnique({
      where: {
        id: articleId
      },
      include: articleInclude()
    });

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "该 Slug 的文章已存在。"
      });
    }

    return next(error);
  }
});

router.post("/admin/:id/publish", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        status: ArticleStatus.PUBLISHED
      },
      include: articleInclude()
    });
    await setPublishedAtIfMissing(articleId);
    const [articleWithPublishTime] = await withArticlePublishTimes([article]);

    return res.json({
      article: formatArticle(articleWithPublishTime)
    });
  } catch (error) {
    return next(error);
  }
});

router.delete("/admin/:id", requireAuth, requireRole("ADMIN"), async (req, res, next) => {
  try {
    const articleId = Number(req.params.id);

    if (!articleId) {
      return res.status(400).json({
        message: "文章 ID 无效。"
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "文章不存在。"
      });
    }

    await prisma.article.delete({
      where: {
        id: articleId
      }
    });

    const articleDirectory = path.join(uploadsRoot, String(articleId));

    if (fs.existsSync(articleDirectory)) {
      fs.rmSync(articleDirectory, { recursive: true, force: true });
    }

    return res.json({
      ok: true
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/admin/:id/images",
  requireAuth,
  requireRole("ADMIN"),
  upload.single("image"),
  async (req, res, next) => {
    try {
      const articleId = Number(req.params.id);

      if (!articleId) {
        return res.status(400).json({
          message: "文章 ID 无效。"
        });
      }

      const existingArticle = await ensureArticleExists(articleId);

      if (!existingArticle) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.rmSync(req.file.path, { force: true });
        }

        return res.status(404).json({
          message: "文章不存在。"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "请选择要上传的图片文件。"
        });
      }

      const imageUrl = `/uploads/articles/${articleId}/${req.file.filename}`;
      const altText = String(req.body?.altText || "").trim() || null;
      const sortOrder = parseChapterOrder(req.body?.sortOrder);

      const image = await prisma.articleImage.create({
        data: {
          articleId,
          imageUrl,
          altText,
          sortOrder
        }
      });

      return res.status(201).json({
        image: {
          id: image.id,
          imageUrl: image.imageUrl,
          altText: image.altText,
          sortOrder: image.sortOrder
        },
        markdown: `![${altText || "Article image"}](${imageUrl})`
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;
