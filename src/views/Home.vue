<template lang="pug">
div(style="display: flex; flex-direction: column; align-items: center")
  div(:style="divStyle")
    Demo(style="position: absolute")
    div(style="position: absolute; display: flex; width: 100%;justify-content: center")
      span.display-1.blue--text(style="margin-top: 32px") Controls JS
  div(
    style="width: 100%; max-width: 960px; padding: 40px",
    v-html="markdownHtml"
  )
</template>

<script>
import markdown from "!raw-loader!../../README.md";
import MarkdownIt from "markdown-it";
import Demo from "./Demo.vue";

export default {
  components: {
    Demo,
  },

  data: () => ({
    markdown,
  }),

  computed: {
    markdownHtml() {
      const highlight = function (str, lang) {
        return (
          '<pre class="hljs"><span>' +
          md.utils.escapeHtml(str) +
          "</span></pre>"
        );
      };
      const md = new MarkdownIt({
        highlight,
        html: true,
      });
      return md.render(markdown);
    },

    divStyle() {
      return {
        width: `${this.$store.windowSize.x}px`,
        height: `${this.$store.windowSize.y}px`,
        position: "relative",
      };
    },
  },

  mounted() {},

  methods: {},
};
</script>

<style>
</style>