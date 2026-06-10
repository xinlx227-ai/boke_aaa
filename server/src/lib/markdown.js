import katex from "katex";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const MATH_PLACEHOLDER_PREFIX = "%%KATEX_BLOCK_";

function createMarkdown(toc = null) {
  const instance = new MarkdownIt({
    html: true,
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
  allowedTags: [
    "a",
    "article",
    "aside",
    "br",
    "blockquote",
    "code",
    "details",
    "div",
    "em",
    "figcaption",
    "figure",
    "footer",
    "header",
    "hr",
    "img",
    "li",
    "main",
    "nav",
    "ol",
    "p",
    "pre",
    "section",
    "span",
    "strong",
    "summary",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "ul",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6"
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ["href", "name", "target", "rel", "title"],
    img: ["src", "alt", "title"],
    div: ["class"],
    span: ["class"],
    p: ["class"],
    code: ["class"],
    pre: ["class"],
    blockquote: ["class"],
    details: ["class"],
    summary: ["class"],
    table: ["class", "align"],
    thead: ["class"],
    tbody: ["class"],
    tfoot: ["class"],
    tr: ["class"],
    th: ["class", "align"],
    td: ["class", "align"],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"]
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"]
  },
  exclusiveFilter(frame) {
    if (frame.tag === "img") {
      const src = String(frame.attribs?.src || "");
      return Boolean(src && !isAllowedImageSource(src));
    }

    return false;
  },
  allowedClasses: {
    div: [/^[a-z0-9_-]+$/i],
    span: [/^[a-z0-9_-]+$/i],
    p: [/^[a-z0-9_-]+$/i],
    code: [/^[a-z0-9_-]+$/i],
    pre: [/^[a-z0-9_-]+$/i],
    blockquote: [/^[a-z0-9_-]+$/i],
    details: [/^[a-z0-9_-]+$/i],
    summary: [/^[a-z0-9_-]+$/i],
    table: [/^[a-z0-9_-]+$/i],
    thead: [/^[a-z0-9_-]+$/i],
    tbody: [/^[a-z0-9_-]+$/i],
    tfoot: [/^[a-z0-9_-]+$/i],
    tr: [/^[a-z0-9_-]+$/i],
    th: [/^[a-z0-9_-]+$/i],
    td: [/^[a-z0-9_-]+$/i]
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow"
    })
  }
};

export function renderMarkdownToSafeHtml(source = "") {
  const rendered = renderMarkdownWithMathPlaceholders(source);
  return restoreMathPlaceholders(sanitizeHtml(rendered.html, sanitizeOptions), rendered.mathBlocks);
}

export function renderMarkdownToSafeHtmlWithToc(source = "") {
  const toc = [];
  const rendered = renderMarkdownWithMathPlaceholders(source, toc);

  return {
    html: restoreMathPlaceholders(sanitizeHtml(rendered.html, sanitizeOptions), rendered.mathBlocks),
    toc
  };
}

export function extractMarkdownToc(source = "") {
  const toc = [];
  createMarkdown(toc).render(stripMathBlocks(source));
  return toc;
}

function renderMarkdownWithMathPlaceholders(source = "", toc = []) {
  const mathBlocks = [];
  const protectedSource = protectCodeFences(source);
  const mathMarkdown = protectedSource.text
    .replace(/(^|\n)\$\$\s*\n?([\s\S]*?)\n?\$\$(?=\n|$)/g, (_match, prefix, latex) => {
      const index = mathBlocks.push(renderKatex(latex, true)) - 1;
      return `${prefix}<div class="math-display">${MATH_PLACEHOLDER_PREFIX}${index}%%</div>`;
    })
    .replace(/(^|[^\\$])\$([^$\n]+?)\$(?!\$)/g, (match, prefix, latex) => {
      if (/\d$/.test(prefix) || /^\d/.test(latex)) {
        return match;
      }

      const index = mathBlocks.push(renderKatex(latex, false)) - 1;
      return `${prefix}${MATH_PLACEHOLDER_PREFIX}${index}%%`;
    });
  const rawHtml = createMarkdown(toc).render(restoreCodeFences(mathMarkdown, protectedSource.fences));

  return {
    html: rawHtml,
    mathBlocks
  };
}

function renderKatex(latex, displayMode) {
  return katex.renderToString(String(latex || "").trim(), {
    displayMode,
    throwOnError: false,
    strict: false,
    trust: false,
    output: "html"
  });
}

function restoreMathPlaceholders(html, mathBlocks) {
  return String(html || "").replace(new RegExp(`${MATH_PLACEHOLDER_PREFIX}(\\d+)%%`, "g"), (_match, index) => mathBlocks[Number(index)] || "");
}

function stripMathBlocks(source) {
  return String(source || "").replace(/(^|\n)\$\$\s*\n?([\s\S]*?)\n?\$\$(?=\n|$)/g, "$1");
}

function protectCodeFences(source) {
  const fences = [];
  const text = String(source || "").replace(/```[\s\S]*?```/g, (match) => {
    const index = fences.push(match) - 1;
    return `%%CODE_FENCE_${index}%%`;
  });

  return { text, fences };
}

function restoreCodeFences(source, fences) {
  return String(source || "").replace(/%%CODE_FENCE_(\d+)%%/g, (_match, index) => fences[Number(index)] || "");
}

function isAllowedImageSource(src) {
  return /^(https?:)?\/\//i.test(src) || src.startsWith("/uploads/");
}
