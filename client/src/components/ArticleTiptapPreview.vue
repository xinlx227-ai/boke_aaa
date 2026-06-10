<script setup>
import { computed, onBeforeUnmount, watch } from "vue";
import { Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Mathematics } from "@tiptap/extension-mathematics";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { markdownToTiptapJson } from "../articleTiptapMarkdown";

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
  markdown: {
    type: String,
    default: ""
  }
});

const editor = useEditor({
  content: markdownToTiptapJson(props.markdown),
  editable: false,
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
      openOnClick: true,
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
    RawHtmlBlock
  ],
  editorProps: {
    attributes: {
      class: "article-editor-tiptap-content article-editor-preview-content",
      "aria-label": "文章预览正文"
    }
  }
});

const currentEditor = computed(() => editor.value);

watch(
  () => props.markdown,
  (markdown) => {
    currentEditor.value?.commands.setContent(markdownToTiptapJson(markdown), {
      emitUpdate: false
    });
  }
);

onBeforeUnmount(() => {
  currentEditor.value?.destroy();
});
</script>

<template>
  <EditorContent v-if="currentEditor" :editor="currentEditor" class="article-editor-preview-renderer" />
</template>
