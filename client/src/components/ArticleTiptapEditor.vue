<script setup>
import { Extension } from "@tiptap/core";
import { computed, onBeforeUnmount, watch } from "vue";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
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
    Placeholder.configure({
      placeholder: "开始撰写 Markdown 正文..."
    }),
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
    link: instance.isActive("link")
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
  insertText,
  insertImage,
  clearFormatting
});
</script>

<template>
  <EditorContent v-if="currentEditor" :editor="currentEditor" class="article-editor-tiptap" />
</template>
