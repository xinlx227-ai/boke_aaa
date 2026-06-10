const RAW_HTML_BLOCK_TAGS = new Set([
  "article",
  "aside",
  "blockquote",
  "details",
  "div",
  "figure",
  "figcaption",
  "footer",
  "header",
  "main",
  "nav",
  "pre",
  "section",
  "table"
]);

export function markdownToTiptapJson(markdown) {
  const blocks = splitMarkdownBlocks(markdown);
  const content = blocks.map(markdownBlockToNode).filter(Boolean);

  return {
    type: "doc",
    content: content.length ? content : [paragraphNode("")]
  };
}

export function tiptapJsonToMarkdown(doc) {
  return (doc?.content || []).map(nodeToMarkdown).filter((block) => block !== null).join("\n\n");
}

export function plainTextToInlineNodes(text) {
  return String(text || "")
    .split("\n")
    .flatMap((line, index) => {
      const nodes = [];

      if (index > 0) {
        nodes.push({ type: "hardBreak" });
      }

      if (line) {
        nodes.push(textNode(line));
      }

      return nodes;
    });
}

function splitMarkdownBlocks(markdown) {
  const lines = String(markdown || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let current = [];
  let fence = null;
  let mathFence = false;
  let htmlFence = null;

  function flush() {
    if (current.length > 0) {
      blocks.push(current.join("\n"));
      current = [];
    }
  }

  for (const line of lines) {
    const fenceMatch = line.match(/^```/);

    if (fenceMatch) {
      current.push(line);
      if (fence) {
        flush();
        fence = null;
      } else {
        fence = "```";
      }
      continue;
    }

    if (fence) {
      current.push(line);
      continue;
    }

    if (/^\s*\$\$\s*$/.test(line)) {
      if (mathFence) {
        current.push(line);
        flush();
        mathFence = false;
      } else {
        flush();
        current.push(line);
        mathFence = true;
      }
      continue;
    }

    if (mathFence) {
      current.push(line);
      continue;
    }

    if (htmlFence) {
      current.push(line);
      if (isClosingHtmlLine(line, htmlFence)) {
        flush();
        htmlFence = null;
      }
      continue;
    }

    const htmlTag = openingHtmlTag(line);
    if (htmlTag) {
      flush();
      current.push(line);
      if (isClosingHtmlLine(line, htmlTag)) {
        flush();
      } else {
        htmlFence = htmlTag;
      }
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    current.push(line);
  }

  flush();
  return blocks;
}

function markdownBlockToNode(block) {
  const trimmed = block.trim();

  if (!trimmed) {
    return null;
  }

  const codeMatch = trimmed.match(/^```([^\s`]*)[^\n]*\n([\s\S]*?)\n?```$/);
  if (codeMatch) {
    const language = codeMatch[1] || null;
    const codeText = codeMatch[2] || "";

    return {
      type: "codeBlock",
      attrs: { language },
      content: codeText ? [{ type: "text", text: codeText }] : undefined
    };
  }

  const blockMathMatch = trimmed.match(/^\$\$\s*\n?([\s\S]*?)\n?\$\$$/);
  if (blockMathMatch) {
    return {
      type: "blockMath",
      attrs: {
        latex: blockMathMatch[1].trim()
      }
    };
  }

  const tableNode = pipeTableToNode(trimmed);
  if (tableNode) {
    return tableNode;
  }

  if (isRawHtmlBlock(trimmed)) {
    return {
      type: "rawHtmlBlock",
      attrs: {
        source: block
      }
    };
  }

  const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
  if (headingMatch && !trimmed.includes("\n")) {
    return {
      type: "heading",
      attrs: { level: headingMatch[1].length },
      content: inlineMarkdownToNodes(headingMatch[2])
    };
  }

  if (/^---+$/.test(trimmed)) {
    return { type: "horizontalRule" };
  }

  if (trimmed.startsWith("> ")) {
    return {
      type: "blockquote",
      content: [
        paragraphNode(
          trimmed
            .split("\n")
            .map((line) => line.replace(/^>\s?/, ""))
            .join("\n")
        )
      ]
    };
  }

  if (/^\s*[-*+]\s+/.test(trimmed)) {
    return {
      type: "bulletList",
      content: trimmed.split("\n").map((line) => listItemNode(line.replace(/^\s*[-*+]\s+/, "")))
    };
  }

  if (/^\s*\d+\.\s+/.test(trimmed)) {
    return {
      type: "orderedList",
      attrs: { start: 1, type: null },
      content: trimmed.split("\n").map((line) => listItemNode(line.replace(/^\s*\d+\.\s+/, "")))
    };
  }

  return paragraphNode(trimmed);
}

function listItemNode(markdown) {
  return {
    type: "listItem",
    content: [paragraphNode(markdown)]
  };
}

function paragraphNode(markdown) {
  return {
    type: "paragraph",
    content: inlineMarkdownToNodes(markdown)
  };
}

function inlineMarkdownToNodes(markdown) {
  const text = String(markdown || "");
  const nodes = [];
  const tokenPattern = /!\[([^\]]*)]\(([^)\s]+)(?:\s+"([^"]+)")?\)|\[([^\]]+)]\(([^)\s]+)\)|(`[^`\n]+`)|(\$[^$\n]+\$)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)/g;
  let index = 0;
  let match;

  while ((match = tokenPattern.exec(text))) {
    if (match.index > index) {
      nodes.push(...plainTextToInlineNodes(text.slice(index, match.index)));
    }

    if (match[1] !== undefined) {
      nodes.push({
        type: "image",
        attrs: {
          src: match[2],
          alt: match[1] || null,
          title: match[3] || null
        }
      });
    } else if (match[4] !== undefined) {
      pushInlineNode(nodes, textNode(match[4], [{ type: "link", attrs: { href: match[5], target: "_blank", rel: "noopener noreferrer nofollow", class: null } }]));
    } else if (match[6] !== undefined) {
      pushInlineNode(nodes, textNode(match[6].slice(1, -1), [{ type: "code" }]));
    } else if (match[7] !== undefined) {
      if (shouldParseInlineMath(text, match.index, match[7])) {
        nodes.push({
          type: "inlineMath",
          attrs: {
            latex: match[7].slice(1, -1).trim()
          }
        });
      } else {
        pushInlineNode(nodes, textNode(match[7]));
      }
    } else if (match[8] !== undefined) {
      pushInlineNode(nodes, textNode(match[8].slice(2, -2), [{ type: "bold" }]));
    } else if (match[9] !== undefined) {
      pushInlineNode(nodes, textNode(match[9].slice(1, -1), [{ type: "italic" }]));
    }

    index = match.index + match[0].length;
  }

  if (index < text.length) {
    nodes.push(...plainTextToInlineNodes(text.slice(index)));
  }

  return nodes.length ? nodes : undefined;
}

function pushInlineNode(nodes, node) {
  if (node) {
    nodes.push(node);
  }
}

function textNode(text, marks = []) {
  const value = String(text || "");

  if (!value) {
    return null;
  }

  const node = { type: "text", text: value };

  if (marks.length > 0) {
    node.marks = marks;
  }

  return node;
}

function nodeToMarkdown(node) {
  if (!node) {
    return null;
  }

  if (node.type === "heading") {
    const level = Math.min(Math.max(Number(node.attrs?.level) || 1, 1), 3);
    return `${"#".repeat(level)} ${inlineNodesToMarkdown(node.content || [])}`.trimEnd();
  }

  if (node.type === "paragraph") {
    return inlineNodesToMarkdown(node.content || []);
  }

  if (node.type === "blockquote") {
    return (node.content || [])
      .map(nodeToMarkdown)
      .join("\n")
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (node.type === "codeBlock") {
    const language = node.attrs?.language || "";
    return `\`\`\`${language}\n${inlineNodesToPlainText(node.content || [])}\n\`\`\``;
  }

  if (node.type === "bulletList") {
    return (node.content || []).map((item) => `- ${listItemToMarkdown(item)}`).join("\n");
  }

  if (node.type === "orderedList") {
    return (node.content || []).map((item, index) => `${index + 1}. ${listItemToMarkdown(item)}`).join("\n");
  }

  if (node.type === "horizontalRule") {
    return "---";
  }

  if (node.type === "image") {
    return imageNodeToMarkdown(node);
  }

  if (node.type === "table") {
    return tableNodeToMarkdown(node);
  }

  if (node.type === "blockMath") {
    return `$$\n${node.attrs?.latex || ""}\n$$`;
  }

  if (node.type === "rawHtmlBlock") {
    return node.attrs?.source || "";
  }

  return inlineNodesToMarkdown(node.content || []);
}

function listItemToMarkdown(item) {
  return (item.content || []).map(nodeToMarkdown).filter(Boolean).join("\n  ");
}

function inlineNodesToPlainText(nodes) {
  return nodes.map((node) => (node.type === "text" ? node.text || "" : inlineNodesToPlainText(node.content || []))).join("");
}

function inlineNodesToMarkdown(nodes) {
  return nodes.map(inlineNodeToMarkdown).filter((text) => text !== null).join("");
}

function inlineNodeToMarkdown(node) {
  if (!node) {
    return null;
  }

  if (node.type === "text") {
    return applyMarks(node.text || "", node.marks || []);
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  if (node.type === "image") {
    return imageNodeToMarkdown(node);
  }

  if (node.type === "inlineMath") {
    return `$${node.attrs?.latex || ""}$`;
  }

  return inlineNodesToMarkdown(node.content || []);
}

function applyMarks(text, marks) {
  return marks.reduce((value, mark) => {
    if (mark.type === "bold") {
      return `**${value}**`;
    }

    if (mark.type === "italic") {
      return `*${value}*`;
    }

    if (mark.type === "code") {
      return `\`${value}\``;
    }

    if (mark.type === "link") {
      return `[${value}](${mark.attrs?.href || ""})`;
    }

    return value;
  }, text);
}

function imageNodeToMarkdown(node) {
  const alt = node.attrs?.alt || "";
  const src = node.attrs?.src || "";
  const title = node.attrs?.title ? ` "${node.attrs.title}"` : "";
  return `![${alt}](${src}${title})`;
}

function openingHtmlTag(line) {
  const match = String(line || "").match(/^\s*<([a-z][\w:-]*)(?=\s|>|$)/i);
  const tag = match?.[1]?.toLowerCase();
  return tag && RAW_HTML_BLOCK_TAGS.has(tag) ? tag : null;
}

function isClosingHtmlLine(line, tag) {
  return new RegExp(`</${tag}\\s*>\\s*$`, "i").test(String(line || ""));
}

function isRawHtmlBlock(markdown) {
  const tag = openingHtmlTag(markdown);
  return Boolean(tag && isClosingHtmlLine(markdown, tag));
}

function pipeTableToNode(markdown) {
  const lines = String(markdown || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2 || !looksLikePipeRow(lines[0]) || !looksLikePipeRow(lines[1])) {
    return null;
  }

  const header = parsePipeRow(lines[0]);
  const aligns = parsePipeSeparator(lines[1]);

  if (!header.length || !aligns || aligns.length !== header.length) {
    return null;
  }

  const rows = [tableRowNode(header, aligns, true)];

  for (const line of lines.slice(2)) {
    if (!looksLikePipeRow(line)) {
      return null;
    }

    const cells = normalizeTableCells(parsePipeRow(line), header.length);
    rows.push(tableRowNode(cells, aligns, false));
  }

  return {
    type: "table",
    content: rows
  };
}

function looksLikePipeRow(line) {
  return String(line || "").includes("|");
}

function parsePipeSeparator(line) {
  const cells = parsePipeRow(line);

  if (!cells.length) {
    return null;
  }

  const aligns = [];

  for (const cell of cells) {
    const value = cell.trim();

    if (!/^:?-{3,}:?$/.test(value)) {
      return null;
    }

    if (value.startsWith(":") && value.endsWith(":")) {
      aligns.push("center");
    } else if (value.endsWith(":")) {
      aligns.push("right");
    } else if (value.startsWith(":")) {
      aligns.push("left");
    } else {
      aligns.push(null);
    }
  }

  return aligns;
}

function parsePipeRow(line) {
  let source = String(line || "").trim();

  if (source.startsWith("|")) {
    source = source.slice(1);
  }

  if (source.endsWith("|")) {
    source = source.slice(0, -1);
  }

  const cells = [];
  let current = "";
  let escaped = false;

  for (const char of source) {
    if (escaped) {
      current += char === "|" ? char : `\\${char}`;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function shouldParseInlineMath(text, start, token) {
  const before = start > 0 ? text[start - 1] : "";
  const latex = String(token || "").slice(1, -1).trim();

  return Boolean(latex && !/\d$/.test(before) && !/^\d/.test(latex));
}

function normalizeTableCells(cells, count) {
  return Array.from({ length: count }, (_, index) => cells[index] || "");
}

function tableRowNode(cells, aligns, isHeader) {
  return {
    type: "tableRow",
    content: normalizeTableCells(cells, aligns.length).map((cell, index) => {
      const attrs = aligns[index] ? { align: aligns[index] } : undefined;

      return {
        type: isHeader ? "tableHeader" : "tableCell",
        attrs,
        content: [paragraphNode(cell)]
      };
    })
  };
}

function tableNodeToMarkdown(node) {
  const rows = node.content || [];

  if (rows.length === 0) {
    return "";
  }

  const matrix = rows.map((row) => row.content || []);
  const columnCount = Math.max(...matrix.map((row) => row.length), 1);
  const header = normalizeTableCells(matrix[0].map(tableCellToMarkdown), columnCount);
  const aligns = normalizeTableCells(matrix[0].map((cell) => cell.attrs?.align || null), columnCount);
  const lines = [
    markdownTableRow(header),
    markdownTableRow(aligns.map((align) => tableAlignMarker(align)))
  ];

  for (const row of matrix.slice(1)) {
    lines.push(markdownTableRow(normalizeTableCells(row.map(tableCellToMarkdown), columnCount)));
  }

  return lines.join("\n");
}

function tableCellToMarkdown(cell) {
  return (cell.content || [])
    .map(nodeToMarkdown)
    .filter((value) => value !== null)
    .join(" ")
    .replace(/\n+/g, " ")
    .trim();
}

function markdownTableRow(cells) {
  return `| ${cells.map(escapeTableCell).join(" | ")} |`;
}

function tableAlignMarker(align) {
  if (align === "left") {
    return ":---";
  }

  if (align === "right") {
    return "---:";
  }

  if (align === "center") {
    return ":---:";
  }

  return "---";
}

function escapeTableCell(value) {
  return String(value || "").replace(/\|/g, "\\|");
}
