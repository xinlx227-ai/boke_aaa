import assert from "node:assert/strict";
import test from "node:test";

import { markdownToTiptapJson, tiptapJsonToMarkdown } from "../../client/src/articleTiptapMarkdown.js";
import { renderMarkdownToSafeHtml } from "../src/lib/markdown.js";

test("tiptap markdown conversion preserves table math raw html footnotes and code fences", () => {
  const source = [
    "| Name | Score |",
    "| --- | ---: |",
    "| Alice | 10 |",
    "",
    "Inline math $E = mc^2$ stays inline.",
    "",
    "$$",
    "\\int_0^1 x^2 dx",
    "$$",
    "",
    "<div class=\"note\">",
    "  <p>Keep this HTML.</p>",
    "</div>",
    "",
    "Here is a footnote[^a].",
    "",
    "[^a]: Footnote body.",
    "",
    "```js",
    "const price = \"$100\";",
    "const html = \"<div>safe text</div>\";",
    "```"
  ].join("\n");

  const doc = markdownToTiptapJson(source);
  const markdown = tiptapJsonToMarkdown(doc);

  assert.match(markdown, /\| Name \| Score \|/);
  assert.match(markdown, /\| --- \| ---: \|/);
  assert.match(markdown, /\| Alice \| 10 \|/);
  assert.match(markdown, /\$E = mc\^2\$/);
  assert.match(markdown, /\$\$\n\\int_0\^1 x\^2 dx\n\$\$/);
  assert.match(markdown, /<div class="note">\n  <p>Keep this HTML\.<\/p>\n<\/div>/);
  assert.match(markdown, /Here is a footnote\[\^a]\./);
  assert.match(markdown, /\[\^a]: Footnote body\./);
  assert.match(markdown, /```js\nconst price = "\$100";\nconst html = "<div>safe text<\/div>";\n```/);
});

test("server markdown renderer outputs tables and math while filtering unsafe html", () => {
  const html = renderMarkdownToSafeHtml([
    "| Name | Score |",
    "| --- | ---: |",
    "| Alice | 10 |",
    "",
    "Inline math $E = mc^2$ stays inline.",
    "",
    "$$",
    "\\int_0^1 x^2 dx",
    "$$",
    "",
    "- Keep unordered lists",
    "",
    "<div class=\"note\" onclick=\"alert(1)\">",
    "  <p>Safe text</p>",
    "  <img src=\"/uploads/articles/demo.png\" alt=\"demo\">",
    "  <img src=\"data:text/html;base64,PHNjcmlwdD4=\" alt=\"bad\">",
    "  <script>alert(1)</script>",
    "  <a href=\"javascript:alert(1)\">bad</a>",
    "  <iframe src=\"https://example.com\"></iframe>",
    "</div>",
    "",
    "```",
    "$not_math$",
    "<div>not html</div>",
    "```"
  ].join("\n"));

  assert.match(html, /<table>/);
  assert.match(html, /<th>Name<\/th>/);
  assert.match(html, /<td>Alice<\/td>/);
  assert.match(html, /class="katex/);
  assert.match(html, /<ul>/);
  assert.match(html, /<li>Keep unordered lists<\/li>/);
  assert.match(html, /<div class="note">/);
  assert.match(html, /Safe text/);
  assert.match(html, /<img src="\/uploads\/articles\/demo.png" alt="demo" \/>/);
  assert.doesNotMatch(html, /onclick/);
  assert.doesNotMatch(html, /data:text\/html/);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /\$not_math\$/);
  assert.match(html, /&lt;div&gt;not html&lt;\/div&gt;/);
});
