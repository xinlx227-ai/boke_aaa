<script setup>
import { Extension, Node } from "@tiptap/core";
import { computed, onBeforeUnmount, watch } from "vue";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { markdownToTiptapJson, plainTextToInlineNodes, tiptapJsonToMarkdown } from "../articleTiptapMarkdown";

const ExitInlineMarksOnSpace = Extension.create({
  name: "exitInlineMarksOnSpace",

  addKeyboardShortcuts() {
    return {
      Space: ({ editor }) => {
        const { state } = editor;
        const activeMarks = ["bold", "italic", "code", "link"].filter((mark) => editor.isActive(mark));

        if (!state.selection.empty || activeMarks.length === 0) {
          return false;
        }

        let chain = editor.chain().insertContent(" ");

        for (const mark of activeMarks) {
          chain = chain.unsetMark(mark);
        }

        return chain.run();
      }
    };
  }
});

const RawHtmlBlock = Node.create({
  name: "rawHtmlBlock",

  group: "block",
  atom: true,

  addAttributes() {
    return {
      source: {
        default: ""
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: "pre[data-raw-html-block]"
      }
    ];
  },

  addNodeView() {
    return ({ node, view, getPos }) => {
      let currentNode = node;
      const dom = document.createElement("button");
      dom.type = "button";
      dom.className = "article-editor-raw-html-block";
      dom.dataset.rawHtmlBlock = "";

      const render = () => {
        const source = String(currentNode.attrs?.source || "");
        const firstLine = source.split("\n").find((line) => line.trim())?.trim() || "HTML";
        dom.textContent = "";

        const title = document.createElement("strong");
        title.textContent = "HTML block";
        dom.append(title);

        const hint = document.createElement("small");
        hint.textContent = this.editor?.isEditable ? "Click to edit source" : "Raw HTML source is preserved";
        dom.append(hint);

        const preview = document.createElement("code");
        preview.textContent = firstLine;
        dom.append(preview);
      };

      const editSource = (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!this.editor?.isEditable) {
          return;
        }

        const currentSource = String(currentNode.attrs?.source || "");
        const nextSource = window.prompt("Edit HTML source", currentSource);

        if (nextSource === null) {
          return;
        }

        const pos = typeof getPos === "function" ? getPos() : null;

        if (typeof pos !== "number") {
          return;
        }

        view.dispatch(
          view.state.tr.setNodeMarkup(pos, undefined, {
            ...currentNode.attrs,
            source: nextSource
          })
        );
      };

      dom.addEventListener("click", editSource);
      render();

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== currentNode.type.name) {
            return false;
          }

          currentNode = updatedNode;
          render();
          return true;
        },
        stopEvent() {
          return true;
        },
        destroy() {
          dom.removeEventListener("click", editSource);
        }
      };
    };
  },

  renderHTML({ node }) {
    const source = String(node.attrs?.source || "");
    const firstLine = source.split("\n").find((line) => line.trim())?.trim() || "HTML";
    return [
      "pre",
      {
        "data-raw-html-block": "",
        class: "article-editor-raw-html-block"
      },
      ["code", `HTML block: ${firstLine}`]
    ];
  }
});

const props = defineProps({
  modelValue: {
    type: String,
    default: ""
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(["update:modelValue", "focus", "state-change"]);

let syncingFromModel = false;
let syncingFromEditor = false;

const editor = useEditor({
  content: markdownToTiptapJson(props.modelValue),
  editable: !props.disabled,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3]
      },
      link: false
    }),
    Link.configure({
      autolink: true,
      linkOnPaste: true,
      openOnClick: false,
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        target: "_blank"
      }
    }),
    Image.configure({
      inline: true,
      allowBase64: false
    }),
    TableKit.configure({
      table: {
        resizable: false,
        HTMLAttributes: {
          class: "article-editor-markdown-table"
        }
      }
    }),
    Mathematics.configure({
      katexOptions: {
        throwOnError: false
      }
    }),
    Placeholder.configure({
      placeholder: "开始撰写 Markdown 正文..."
    }),
    RawHtmlBlock,
    ExitInlineMarksOnSpace
  ],
  editorProps: {
    attributes: {
      class: "article-editor-tiptap-content",
      role: "textbox",
      "aria-label": "文章正文"
    }
  },
  onFocus() {
    emit("focus");
    emitEditorState();
  },
  onCreate({ editor }) {
    emitEditorState(editor);
  },
  onSelectionUpdate({ editor }) {
    emitEditorState(editor);
  },
  onTransaction({ editor }) {
    emitEditorState(editor);
  },
  onUpdate({ editor }) {
    if (syncingFromModel) {
      emitEditorState(editor);
      return;
    }

    syncingFromEditor = true;
    emit("update:modelValue", tiptapJsonToMarkdown(editor.getJSON()));
    emitEditorState(editor);
    queueMicrotask(() => {
      syncingFromEditor = false;
    });
  }
});

const currentEditor = computed(() => editor.value);

watch(
  () => props.disabled,
  (disabled) => {
    currentEditor.value?.setEditable(!disabled);
  }
);

watch(
  () => props.modelValue,
  (value) => {
    const instance = currentEditor.value;

    if (!instance || syncingFromEditor) {
      return;
    }

    const currentMarkdown = tiptapJsonToMarkdown(instance.getJSON());

    if (currentMarkdown === String(value || "")) {
      return;
    }

    syncingFromModel = true;
    instance.commands.setContent(markdownToTiptapJson(value), {
      emitUpdate: false
    });
    emitEditorState(instance);
    queueMicrotask(() => {
      syncingFromModel = false;
    });
  }
);

onBeforeUnmount(() => {
  currentEditor.value?.destroy();
});

function focus() {
  currentEditor.value?.chain().focus().run();
}

function toggleBold() {
  currentEditor.value?.chain().focus().toggleBold().run();
}

function toggleItalic() {
  currentEditor.value?.chain().focus().toggleItalic().run();
}

function setHeading(level = 1) {
  currentEditor.value?.chain().focus().toggleHeading({ level }).run();
}

function toggleBlockquote() {
  currentEditor.value?.chain().focus().toggleBlockquote().run();
}

function toggleCodeBlock() {
  currentEditor.value?.chain().focus().toggleCodeBlock().run();
}

function toggleCode() {
  currentEditor.value?.chain().focus().toggleCode().run();
}

function toggleBulletList() {
  currentEditor.value?.chain().focus().toggleBulletList().run();
}

function toggleOrderedList() {
  currentEditor.value?.chain().focus().toggleOrderedList().run();
}

function setLink(href = "https://example.com") {
  const url = String(href || "").trim();

  if (!url) {
    currentEditor.value?.chain().focus().unsetLink().run();
    return;
  }

  currentEditor.value?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
}

function insertHorizontalRule() {
  currentEditor.value?.chain().focus().setHorizontalRule().run();
}

function insertTable() {
  currentEditor.value?.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run();
}

function insertBlockMath(latex = "E = mc^2") {
  currentEditor.value?.chain().focus().insertBlockMath({ latex }).run();
}

function insertText(text) {
  const content = plainTextToInlineNodes(String(text || "").trim());

  if (!content?.length) {
    return;
  }

  currentEditor.value
    ?.chain()
    .focus()
    .insertContent({
      type: "paragraph",
      content
    })
    .run();
}

function insertImage({ src, alt = "", title = "" }) {
  if (!src) {
    return;
  }

  currentEditor.value?.chain().focus().setImage({ src, alt, title }).run();
}

function clearFormatting() {
  currentEditor.value?.chain().focus().unsetAllMarks().clearNodes().run();
}

function emitEditorState(instance = currentEditor.value) {
  if (!instance) {
    return;
  }

  emit("state-change", {
    heading: [1, 2, 3].find((level) => instance.isActive("heading", { level })) || 0,
    bold: instance.isActive("bold"),
    italic: instance.isActive("italic"),
    blockquote: instance.isActive("blockquote"),
    code: instance.isActive("code") || instance.isActive("codeBlock"),
    bulletList: instance.isActive("bulletList"),
    orderedList: instance.isActive("orderedList"),
    link: instance.isActive("link"),
    table: instance.isActive("table"),
    math: instance.isActive("inlineMath") || instance.isActive("blockMath")
  });
}

defineExpose({
  focus,
  toggleBold,
  toggleItalic,
  setHeading,
  toggleBlockquote,
  toggleCodeBlock,
  toggleCode,
  toggleBulletList,
  toggleOrderedList,
  setLink,
  insertHorizontalRule,
  insertTable,
  insertBlockMath,
  insertText,
  insertImage,
  clearFormatting
});
</script>

<template>
  <EditorContent v-if="currentEditor" :editor="currentEditor" class="article-editor-tiptap" />
</template>
