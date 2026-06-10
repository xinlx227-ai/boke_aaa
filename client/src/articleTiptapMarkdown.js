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

  const codeMatch = trimmed.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  if (codeMatch) {
    const codeText = codeMatch[1] || "";

    return {
      type: "codeBlock",
      content: codeText ? [{ type: "text", text: codeText }] : undefined
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
  const tokenPattern = /!\[([^\]]*)]\(([^)\s]+)(?:\s+"([^"]+)")?\)|\[([^\]]+)]\(([^)\s]+)\)|(\*\*[^*]+\*\*)|(\*[^*\n]+\*)|(`[^`\n]+`)/g;
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
      pushInlineNode(nodes, textNode(match[6].slice(2, -2), [{ type: "bold" }]));
    } else if (match[7] !== undefined) {
      pushInlineNode(nodes, textNode(match[7].slice(1, -1), [{ type: "italic" }]));
    } else if (match[8] !== undefined) {
      pushInlineNode(nodes, textNode(match[8].slice(1, -1), [{ type: "code" }]));
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
    return `\`\`\`\n${inlineNodesToPlainText(node.content || [])}\n\`\`\``;
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
