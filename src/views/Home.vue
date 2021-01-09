<template lang="pug">
div(style="display: flex; flex-direction: column; align-items: center")
  div(:style="divStyle")
    div(style="display: flex; flex-direction: column; align-items: center")
      v-img(src="@assets/logo.png", width="350px")
      span.display-1.font-weight-light.white--text(style="margin-top: 16px") Controls JS
      //- Demo(style="margin-top: 48px")
  div(
    style="width: 100%; max-width: 960px; padding: 40px",
    v-html="markdownHtml"
  )
</template>

<script>
import markdown from "!raw-loader!../../README.md";
import MarkdownIt from "markdown-it";

export default {
  components: {
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
        display: "flex",
        "flex-direction": "row",
        "justify-content": "center",
        "align-items": "center",
        background: "#00796B",
      };
    },
  },

  mounted() {},

  methods: {},
};
</script>

<style>
</style>