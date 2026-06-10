<script setup>
import { computed, onBeforeUnmount, watch } from "vue";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import { markdownToTiptapJson } from "../articleTiptapMarkdown";

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
    })
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
