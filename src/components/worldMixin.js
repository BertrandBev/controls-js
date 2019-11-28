import Two from "two.js";

const HEIGHT = 512;
const FRAME_COLOR = "#455A64";

export default {
  data: () => ({
    two: null,
    mouseTarget: null
  }),

  computed: {
    mouseDragging() {
      return this.mouseTarget !== null
    },

    canvas() {
      throw new Error('This method must be overidden')
    },

    height() {
      return HEIGHT;
    },

    width() {
      return this.canvas.parentElement.clientWidth;
    },

    scale() {
      throw new Error('This method must be overidden')
    }
  },

  mounted() {
    const canvas = this.$refs.canvas;
    const params = { width: this.width, height: this.height };
    this.two = new Two(params).appendTo(canvas);

    // Add mouse events
    document.addEventListener("mouseup", ev => {
      this.dragging = false;
      this.mouseTarget = null;
    });
    canvas.addEventListener("mousedown", ev => {
      this.dragging = true;
      this.mouseTarget = this.canvasToWorld([ev.offsetX, ev.offsetY]);
    });
    canvas.addEventListener("mousemove", ev => {
      if (this.dragging) {
        this.mouseTarget = this.canvasToWorld([ev.offsetX, ev.offsetY]);
      }
    });

    // Frame
    const frame = this.two.makeGroup(
      this.two.makeLine(-this.width / 3, 0, this.width / 3, 0),
      this.two.makeLine(0, -this.width / 6, 0, this.width / 6)
    );
    frame.translation.set(this.width / 2, this.height / 2);
    frame.fill = FRAME_COLOR;
  },

  methods: {
    canvasToWorld(pos) {
      return [
        (pos[0] - this.width / 2) / this.scale,
        -(pos[1] - this.height / 2) / this.scale
      ];
    },

    worldToCanvas(pos) {
      return [
        pos[0] * this.scale + this.width / 2,
        -pos[1] * this.scale + this.height / 2
      ];
    },
  }
}