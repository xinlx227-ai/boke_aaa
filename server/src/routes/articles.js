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

function buildArticleData(input) {
  const title = String(input?.title || "").trim();
  const requestedSlug = String(input?.slug || "").trim();
  const slug = slugify(requestedSlug || title);
  const contentMarkdown = String(input?.contentMarkdown || "");
  const rendered = renderMarkdownToSafeHtmlWithToc(contentMarkdown);
  const chapterOrder = parseChapterOrder(input?.chapterOrder);
  const categoryName = normalizeName(input?.categoryName);
  const tagNames = normalizeTagNames(input?.tagNames ?? input?.tags);

  if (!title) {
    return {
      error: "Title is required."
    };
  }

  if (!slug) {
    return {
      error: "A valid slug could not be generated from the title."
    };
  }

  if (title.length > 200) {
    return {
      error: "Title must be 200 characters or fewer."
    };
  }

  if (slug.length > 220) {
    return {
      error: "Slug must be 220 characters or fewer."
    };
  }

  return {
    data: {
      title,
      slug,
      contentMarkdown,
      contentHtml: rendered.html,
      chapterOrder,
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
      callback(new Error("Only image uploads are supported."));
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
      callback(new Error("Only zip uploads are supported."));
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
        reason: "Invalid zip path."
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
      reason: "Unsupported file type. Only .md and common image files are imported."
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
          chapterOrder: "asc"
        },
        {
          createdAt: "desc"
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
          updatedAt: "desc"
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
        message: "Article not found."
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
          message: "Zip file is required."
        });
      }

      let zip;

      try {
        zip = new AdmZip(req.file.buffer);
      } catch (_error) {
        return res.status(400).json({
          message: "Uploaded file is not a valid zip archive."
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
              reason: "A title could not be generated from the Markdown file."
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
              chapterOrder: index + 1,
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
              ? "An article with that slug already exists."
              : error.message || "Article import failed.";

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
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    const article = await prisma.article.create({
      data: {
        ...articleData,
        categoryId: relations.categoryId,
        authorId: req.auth.userId,
        status: ArticleStatus.DRAFT
      },
      include: articleInclude()
    });

    await replaceArticleTags(article.id, relations.tagIds);

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
        message: "An article with that slug already exists."
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
        message: "Invalid article id."
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "Article not found."
      });
    }

    const built = buildArticleData(req.body);

    if (built.error) {
      return res.status(400).json({
        message: built.error
      });
    }

    const { categoryName, tagNames, ...articleData } = built.data;
    const relations = await buildArticleRelations({
      categoryName,
      tagNames
    });

    await replaceArticleTags(articleId, relations.tagIds);

    const article = await prisma.article.update({
      where: {
        id: articleId
      },
      data: {
        ...articleData,
        categoryId: relations.categoryId
      },
      include: articleInclude()
    });

    return res.json({
      article: formatArticle(article)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({
        message: "An article with that slug already exists."
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
        message: "Invalid article id."
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "Article not found."
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

    return res.json({
      article: formatArticle(article)
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
        message: "Invalid article id."
      });
    }

    const existingArticle = await ensureArticleExists(articleId);

    if (!existingArticle) {
      return res.status(404).json({
        message: "Article not found."
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
          message: "Invalid article id."
        });
      }

      const existingArticle = await ensureArticleExists(articleId);

      if (!existingArticle) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
          fs.rmSync(req.file.path, { force: true });
        }

        return res.status(404).json({
          message: "Article not found."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Image file is required."
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
