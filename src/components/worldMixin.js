import Two from "two.js";

const FPS_ALPHA = 0.95;
const FRAME_COLOR = "#455A64";

export default {
  data: () => ({
    // FPS computation
    fps: 0,
    lastUpdate: Date.now(),
    // Private variables
    t: 0, // Simulated time
    two: null,
    mouseTarget: null,
    loop: null,
  }),

  computed: {
    mouseDragging() {
      return this.mouseTarget !== null
    },

    canvas() {
      throw new Error('This method must be overidden')
    },

    height() {
      return this.canvas.parentElement.clientHeight;
    },

    width() {
      return this.canvas.parentElement.clientWidth;
    },

    scale() {
      throw new Error('This method must be overidden')
    },

    dt() {
      throw new Error('This method must be overidden')
    }
  },

  mounted() {
    const canvas = this.$refs.canvas;
    const params = { width: this.width, height: this.height };
    this.two = new Two(params).appendTo(canvas);

    // Add helper functions
    this.two.scale = this.scale;
    this.two.canvas = canvas;
    this.two.worldToCanvas = this.worldToCanvas;
    this.two.canvasToWorld = this.canvasToWorld;

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

    // Start loop
    const updateFun = () => {
      const now = Date.now();
      this.t += this.dt
      try {
        this.update();
      } catch (e) {
        console.error(e)
      }
      this.two.update();
      const dtMeas = (Date.now() - this.lastUpdate) / 1000
      this.fps = this.fps * FPS_ALPHA + (1 - FPS_ALPHA) / dtMeas
      this.lastUpdate = Date.now();
      const updateTimeMs = Date.now() - now
      const targetDtMs = Math.max(0, this.dt * 1000 - updateTimeMs)
      this.loop = setTimeout(updateFun, targetDtMs);
    };

    this.$nextTick(() => {
      updateFun();
    })
  },

  beforeDestroy() {
    clearTimeout(this.loop)
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

    update() {
      throw new Error('This method must be overidden')
    },

    reset() {
      this.t = 0
    }
  }
}