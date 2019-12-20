<template lang='pug'>
v-row(ref='container'
      justify='center')
  v-row(justify='center')
    v-btn(@click='optimize') optimize
    v-btn.ml-2(@click='download') download
    v-btn.ml-2(@click='reset') reset
    //- v-btn.ml-2(@click='mdp') mdp
  div.canvas(ref='canvas')
</template>

<script>
import { Quadrotor2D, flipTraj } from "@/components/quadrotor2D.js";
import LQR from "@/components/controllers/LQR.js";
import worldMixin from "@/components/worldMixin.js";
import _ from "lodash";
import eig from "@eigen";
import { InteractivePath } from "@/components/interactivePath.js";
import Trajectory from '@/components/planners/trajectory.js'
import { DirectCollocation } from "@/components/directCollocation.js";
import MPC from "@/components/controllers/MPC.js";

const COLOR = "#00897B";
const COLOR_DARK = "#1565C0";
const FRAME_COLOR = "#455A64";
const COLOR_RED = "#F44336";

const GEOM = {
  thickness: 8,
  length: 128
};

export default {
  name: "Quadrotor2D",

  mixins: [worldMixin],

  data: () => ({
    // Graphics
    graphics: {},
    dt: 0.01,
    // Mode
    mode: "Flatness",
    // State
    system: null,
    controller: null,
    // updateTime: Date.now(),
    trajectory: null,
    mdp: null
  }),

  computed: {
    canvas() {
      return this.$refs.canvas;
    },

    scale() {
      return GEOM.length / this.system.params.l;
    }
  },

  watch: {},

  created() {
    const params = {
      x0: new eig.Matrix(6, 1)
    };
    this.system = new Quadrotor2D(params);
    params.u0 = this.system.ssCommand();
    this.controller = new LQR(this.system, params.x0, params.u0);
  },

  mounted() {
    // Create body
    const body = this.two.makeRectangle(0, 0, GEOM.length, GEOM.thickness);
    body.fill = COLOR;
    body.linewidth = 2;

    // Create propellers
    const propHeight = -1.5 * GEOM.thickness;
    const propLength = GEOM.length / 4;
    this.graphics.force = [null, null];
    const sides = [(3 * GEOM.length) / 7, (-3 * GEOM.length) / 7].map(x => {
      const prop = this.two.makeLine(
        x - propLength,
        propHeight,
        x + propLength,
        propHeight
      );
      prop.linewidth = 3;
      prop.fill = COLOR_DARK;
      const shaft = this.two.makeLine(x, -3, x, propHeight);
      shaft.linewidth = 2;
      shaft.fill = COLOR_DARK;
      // Motors?

      // Forces
      const fLine = this.two.makeLine(x, propHeight, x, propHeight - 10);
      fLine.linewidth = 2;
      fLine.stroke = COLOR_RED;
      const fHead = this.two.makePolygon(x, propHeight - 10, 6, 3);
      fHead.fill = COLOR_RED;

      return {
        prop: this.two.makeGroup(prop, shaft, fLine, fHead),
        fLine,
        fHead
      };
    });
    this.graphics.setControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.vGet(idx) * 5, -100, 100);
        side.fHead.translation.y = propHeight - uh;
        side.fHead.rotation = uh > 0 ? 0 : Math.PI;
        side.fLine.vertices[1].y = side.fHead.translation.y;
      });
    };
    const trajLines = [...Array(20)].map(() => {
      const line = this.two.makeLine(0, 0, 0, 0);
      return line;
    });
    this.graphics.showTraj = traj => {
      traj.forEach((x, idx) => {
        const xy = this.worldToCanvas([x.vGet(0), x.vGet(1)]);
        trajLines[idx].vertices[0].x = xy[0];
        trajLines[idx].vertices[0].y = xy[1];
        trajLines[idx].vertices[1].x = xy[0];
        trajLines[idx].vertices[1].y = xy[1];
        if (idx > 0) {
          trajLines[idx - 1].vertices[1].x = xy[0];
          trajLines[idx - 1].vertices[1].y = xy[1];
        }
      });
    };
    this.graphics.system = this.two.makeGroup(
      body,
      sides[0].prop,
      sides[1].prop
    );

    // Setup trajectory
    this.trajectory = new Trajectory(true);
    const trajRev = [...flipTraj.x];
    trajRev.reverse();
    const symTraj = [...flipTraj.x, ...trajRev];
    this.trajectory.set(
      symTraj.map(vec => eig.Matrix.fromArray(vec)),
      flipTraj.dt
    );
    this.dt = flipTraj.dt
    this.mdp = new MPC(
      this.system,
      this.trajectory,
      1 / 60,
      20,
      { min: [-20, -20], max: [20, 20] }
    );
    this.mdp.getCommand(); // TEMP

    if (this.mode === "Path") {
      this.path = new InteractivePath(this.two);
      this.path.group.translation.set(this.width / 2, this.height / 2);
      // Update path
      this.updatePathDebounced = _.debounce(this.updatePath, 1000);
      this.path.addUpdateListener(() => {
        this.updatePathDebounced();
      });
      this.updatePathDebounced();
    }

    // Start animation
    const updateFun = () => {
      this.update();
      this.two.update();
      setTimeout(updateFun, this.dt);
    };
    updateFun();
  },

  methods: {
    optimize() {
      const FREE = DirectCollocation.FREE;
      // const xStart = eig.Matrix.fromArray([-2, -1.5, 0, 0, 0, 0]);
      // const xEnd = eig.Matrix.fromArray([2, -1.5, -2 * Math.PI, 0, 0, 0]);
      const xStart = eig.Matrix.fromArray([-2, -1.5, 0, 0, 0, 0]);
      const xEnd = eig.Matrix.fromArray([2, -1.5, 0, 0, 0, 0]);
      const uMax = {
        min: eig.Matrix.fromArray([0, 0]),
        max: eig.Matrix.fromArray([10, 10])
      };
      const nPoints = 20;
      const anchors = [
        { t: 0, x: xStart },
        // { t: 0.5, x: xFlip },
        { t: 1, x: xEnd }
      ];

      const collocation = new DirectCollocation(
        this.system,
        nPoints,
        uMax,
        anchors
      );
      const [x, tEnd] = collocation.optimize(30);
      const dt = tEnd / nPoints;
      this.trajectory.set(x, tEnd / nPoints);
      this.trajectory.print();
    },

    download() {
      const str = this.trajectory.toString();
      const blob = new Blob([str], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = "trajectory";
      link.click();
    },

    reset() {
      if (this.trajectory.ready()) {
        const x = this.trajectory.get(Date.now() / 1000);
        this.system.x.setBlock(0, 0, x.block(0, 0, 6, 1));
      }
    },

    updatePath() {
      // On path update
      const travelTime = 5;
      const dt = 1 / 60;
      const xy = this.path.discretize(travelTime / dt).map(val => {
        const pathPos = [val.x + this.width / 2, val.y + this.height / 2];
        return eig.Matrix.fromArray(this.canvasToWorld(pathPos));
      });
      const x = this.system.fitTrajectory(xy, dt);
      // Init rollout
      this.trajectory.set(x, dt);
    },

    update() {
      // TODO: add FPS meter
      // const dt = Math.min(100, Date.now() - this.updateTime) / 1000;
      // if (dt < 0.05) {
      //   return;
      // }
      let u = this.system.ssCommand();
      if (this.mode === "Flatness" && this.trajectory.ready()) {
        // Flatness mode
        const x = this.trajectory.get(Date.now() / 1000);
        this.system.x.setBlock(0, 0, x.block(0, 0, 6, 1));
        u = x.block(6, 0, 2, 1);
        // this.system.step(u, this.dt, this.mouseTarget);
      
      } else if (this.mode === "MDP" && this.trajectory.ready()) {
        // Temp mdp command
        const xTraj = this.mdp.getCommand();
        const [xn, un] = this.system.shape;
        u = xTraj[0].block(xn, 0, un, 1);
        // u.print('u')
        this.system.step(u, this.dt, this.mouseTarget);
        this.graphics.showTraj(xTraj);
      } else {
        // TODO: hook to mode selector

        u = this.controller.getCommand();
        this.system.step(u, this.dt, this.mouseTarget);
      }
      // Graphic update
      const x = this.system.x;
      this.graphics.system.rotation = -x.vGet(2);
      this.graphics.system.translation.set(
        ...this.worldToCanvas([x.vGet(0), x.vGet(1)])
      );
      this.graphics.setControl(u);
      // this.updateTime = Date.now();
      // Run GC
      eig.GC.flush();
    }
  }
};
</script>

<style>
</style>