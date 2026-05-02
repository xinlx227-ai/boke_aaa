import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

function createMarkdown(toc = null) {
  const instance = new MarkdownIt({
    html: false,
    linkify: true,
    breaks: true
  });

  const defaultHeadingOpen =
    instance.renderer.rules.heading_open ||
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  instance.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const inlineToken = tokens[idx + 1];
    const level = Number(token.tag.slice(1));
    const title = inlineToken?.content || "";
    const id = uniqueHeadingId(title, toc);

    token.attrSet("id", id);

    if (Array.isArray(toc)) {
      toc.push({
        id,
        level,
        title
      });
    }

    return defaultHeadingOpen(tokens, idx, options, env, self);
  };

  return instance;
}

function headingSlug(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "section";
}

function uniqueHeadingId(title, toc) {
  const base = headingSlug(title);

  if (!Array.isArray(toc)) {
    return base;
  }

  const sameBaseCount = toc.filter((item) => item.id === base || item.id.startsWith(`${base}-`)).length;
  return sameBaseCount === 0 ? base : `${base}-${sameBaseCount + 1}`;
}

const sanitizeOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    "img",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6"
  ]),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title"],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow"
    })
  }
};

export function renderMarkdownToSafeHtml(source = "") {
  const rawHtml = createMarkdown([]).render(source);
  return sanitizeHtml(rawHtml, sanitizeOptions);
}

export function renderMarkdownToSafeHtmlWithToc(source = "") {
  const toc = [];
  const rawHtml = createMarkdown(toc).render(source);

  return {
    html: sanitizeHtml(rawHtml, sanitizeOptions),
    toc
  };
}

export function extractMarkdownToc(source = "") {
  const toc = [];
  createMarkdown(toc).render(source);
  return toc;
}
