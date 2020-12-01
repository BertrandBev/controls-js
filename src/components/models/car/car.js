import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { matFromDiag } from '@/components/math.js'
import Two from "two.js";
import { wrapAngle } from '@/components/math.js'

class Car extends Model {
  static TAG = 'car';
  static NAME = 'car';
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'y', show: true },
    { name: 'theta', show: true },
    { name: 'v', show: false }
  ])
  static COMMANDS = Object.freeze([
    { name: 'accel' },
    { name: 'delta' }
  ])

  constructor(params = {}) {
    super(Car.STATES, Car.COMMANDS, {
      ...params,
      l: 1,
      mu: 0.5, // s^-1.kg^-1
      maxAccel: 20,
      maxDelta: Math.PI / 4
    })
  }

  trim() {
    return {
      x: new eig.Matrix([0, 0, Math.PI / 2, 0]),
      u: new eig.Matrix([0, 0]),
    }
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x)
    x.set(2, wrapAngle(x.get(2)))
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    const p = this.params
    const theta = x.get(2);
    const v = x.get(3);
    const delta = u.get(1);
    return new eig.Matrix([
      Math.cos(theta) * v,
      Math.sin(theta) * v,
      v * Math.tan(delta) / p.l,
      u.get(0) - v * p.mu
    ])
  }

  /**
   * Mouse step
   * @param {Number} dt 
   * @param {Array} mouseTarget 
   */
  trackMouse(mouseTarget, dt) {
    const p = this.params
    const [x, y] = [this.x.get(0), this.x.get(1)];
    const [theta, v] = [this.x.get(2), this.x.get(3)]
    const [mx, my] = [mouseTarget[0], mouseTarget[1]];
    const d = Math.sqrt(Math.pow(mx - x, 2) + Math.pow(my - y, 2));
    const [dx, dy] = [Math.cos(theta), Math.sin(theta)];
    const cross = (dx * (my - y) - dy * (mx - x)) / Math.max(d, 1e-3);
    const dtheta = Math.asin(cross);
    const rMin = p.l / Math.cos(p.maxDelta); // Check feasability
    // Controller
    const ac = _.clamp(10 * (d - v * 0.5), -p.maxAccel, p.maxAccel);
    const dc = _.clamp(dtheta, -p.maxDelta, p.maxDelta);
    const u = new eig.Matrix([ac, dc]);
    this.step(u, dt);
    return { u };
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      l: scale / 2,
      w: 3 * scale / 10,
      a1: 0.6, // back wheel lateral clearance
      a2: 0.4, // front wheel lateral clearance
      b: 0.6,  // wheel horizontal clearance
      c: 0.3,  // wheel casing start
      // wheels
      lw: scale / 4,
      ww: scale / 12,
      // marker
      mr: scale / 12
    };
    // Create car
    let anchors = [
      [-GEOM.l, GEOM.w * GEOM.a1],
      [-GEOM.l * GEOM.b, GEOM.w * GEOM.a1],
      [-GEOM.l * GEOM.c, GEOM.w],
      [GEOM.l * GEOM.c, GEOM.w],
      [GEOM.l * GEOM.b, GEOM.w * GEOM.a2],
      [GEOM.l, GEOM.w * GEOM.a2]
    ];
    anchors = anchors.concat(anchors.map(([i, j]) => [i, -j]).reverse());
    const path = two.makePath(..._.flatten(anchors), false)
    path.automatic = false;
    path.fill = colors.blue.base;
    path.stroke = colors.blue.darken4;
    path.linewidth = 3
    this.graphics.car = two.makeGroup(path);

    // Create marker
    for (let k = 0; k < 4; k++) {
      const [sa, ea] = [k * Math.PI / 2, (k + 1) * Math.PI / 2];
      const segment = two.makeArcSegment(0, 0, 0, GEOM.mr, sa, ea);
      segment.fill = k % 2 === 0 ? '#ffffff' : colors.blue.darken4;
      segment.noStroke();
      // segment.linewidth = 3;
      // segment.stroke = colors.blue.darken4;
      this.graphics.car.add(segment);
    }

    // Create wheels
    this.graphics.wheels = []
    const CORNERS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    CORNERS.forEach(([i, j], idx) => {
      const wheel = two.makeRectangle(0, 0, GEOM.lw, GEOM.ww);
      wheel.translation.set(
        i * (GEOM.l - GEOM.lw / 6),
        j * (GEOM.w - GEOM.ww / 2)
      );
      wheel.noStroke();
      wheel.fill = '#000000';
      this.graphics.wheels[idx] = wheel
      this.graphics.car.add(wheel);
    })

    this.graphics.showControl = true
    this.graphics.setControl = u => {
      const delta = u.get(1);
      this.graphics.wheels[2].rotation = -delta;
      this.graphics.wheels[3].rotation = -delta;
    };
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { u } = params
    const x = this.x;
    this.graphics.car.translation.set(...worldToCanvas([x.get(0), x.get(1)]));
    this.graphics.car.rotation = -x.get(2)
    this.graphics.setControl(u);
  }

  /**
   * Kalman filter plugin parameters
   */
  kalmanFilterParams() {
    function measurement(params, x) {
      const pos = new eig.Matrix(params.pos)
      const dist = pos.matSub(x.block(0, 0, 2, 1)).norm();
      return new eig.Matrix([dist]);
    }
    return {
      covariance: [[5, 0, 0, 0], [0, 5, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      processNoise: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      inputNoise: [[0, 0], [0, 0]],
      sensors: [
        { type: 'radar', dt: 1, pos: [-2, 2], measurement, noise: [[5]] }
      ]
    }
  }

  /**
   * Particle filter plugin parameters
   */
  particleFilterParams() {
    function measurement(params, x) {
      const pos = new eig.Matrix(params.pos)
      const dist = pos.matSub(x.block(0, 0, 2, 1)).norm();
      return new eig.Matrix([dist]);
    }
    return {
      nPts: 30,
      dt: 1,
      distribution: 'exact',
      processNoise: [[0.02, 0, 0, 0], [0, 0.02, 0, 0], [0, 0, 0.1, 0], [0, 0, 0, 0.1]],
      range: { // For uniform distribution generation
        min: [-3, -3, -Math.PI, 0],
        max: [3, 3, Math.PI, 10]
      },
      type: '2d',
      sensors: [
        { type: 'radar', dt: 1, pos: [-4, 4], measurement, noise: [[2]] },
        { type: 'radar', dt: 1, pos: [-4, -4], measurement, noise: [[2]] },
        { type: 'radar', dt: 1, pos: [4, -4], measurement, noise: [[2]] },
        { type: 'radar', dt: 1, pos: [4, 4], measurement, noise: [[2]] }
      ]
    }
  }
}

const traj = []

export { traj }
export default Car