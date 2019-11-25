export default {
  data: () => ({
    mouseTarget: null
  }),

  computed: {
    mouseDragging() {
      return this.mouseTarget !== null
    }
  },

  mounted() {
    const canvas = this.$refs.canvas;
    const size = {
      x: this.width,
      y: this.height
    }
    document.addEventListener("mouseup", ev => {
      this.dragging = false;
      this.mouseTarget = null;
    });
    canvas.addEventListener("mousedown", ev => {
      this.dragging = true;
      this.mouseTarget = [ev.offsetX, ev.offsetY];
    });
    canvas.addEventListener("mousemove", ev => {
      if (this.dragging) {
        this.mouseTarget = [ev.offsetX, ev.offsetY];
      }
    });
  }
}