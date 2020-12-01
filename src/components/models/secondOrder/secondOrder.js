import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { matFromDiag } from '@/components/math.js'
import { bounceTraj } from './trajectories.js'
import { createMarker } from '../utils.js'

class SecondOrder extends Model {
  static NAME = 'second order';
  static TAG = 'secondOrder';
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'xDot', show: true, derivative: true },
  ])
  static COMMANDS = Object.freeze([
    { name: 'force' }
  ])

  constructor(params = {}) {
    super(SecondOrder.STATES, SecondOrder.COMMANDS, {
      ...params,
      m: 1
    })
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    return new eig.Matrix([
      x.get(1),
      u.get(0) / this.params.m
    ])
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    return new eig.Matrix([
      [0, 1], [0, 0]
    ])
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    return new eig.Matrix([
      [0], [1 / this.params.m]
    ])
  }

  /**
   * Mouse step
   * @param {Number} dt 
   * @param {Array} mouseTarget 
   */
  trackMouse(mouseTarget, dt) {
    const { u } = this.trim()
    const dx = this.dynamics(this.x, u)
    const xVel = 10 * (mouseTarget[0] - this.x.get(0));
    this.x.set(1, _.clamp(xVel, -15, 15))
    dx.set(0, this.x.get(1))
    // TODO: extract in schema
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    this.setState(newX)
    return { u }
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      cartWidth: scale,
      cartHeight: scale / 2,
      mr: scale / 12 // Marker radius
    }
    // Cart
    const cart = two.makeRectangle(0, 0, GEOM.cartWidth, GEOM.cartHeight);
    cart.fill = colors.teal.base;
    cart.linewidth = 2;

    // Forces
    const sides = [-GEOM.cartWidth / 2, GEOM.cartWidth / 2].map(x => {
      const fLine = two.makeLine(x, 0, x, 0);
      fLine.linewidth = 2;
      fLine.stroke = colors.red.base;
      const fHead = two.makePolygon(0, 0, 6, 3);
      fHead.rotation = (Math.PI / 2) * Math.sign(x);
      fHead.fill = colors.red.base;
      return { group: two.makeGroup(fLine, fHead), fLine, fHead };
    });

    this.graphics.showControl = true
    this.graphics.setControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.get(0) * 5, -100, 100);
        side.group.visible = this.graphics.showControl &&
          (idx - 0.5) * uh > 0 &&
          Math.abs(uh) > 0.1;
        side.fHead.translation.x = (Math.sign(uh) * GEOM.cartWidth) / 2 + uh;
        side.fLine.vertices[1].x = side.fHead.translation.x;
      });
    };
    this.graphics.cart = two.makeGroup(
      cart,
      sides[0].group,
      sides[1].group
    );

    // Create marker
    const marker = createMarker(two, GEOM.mr, colors.green.darken4);
    this.graphics.cart.add(marker);
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { u } = params
    const x = this.x;
    this.graphics.cart.translation.set(...worldToCanvas([x.get(0), 0]));
    if (u)
      this.graphics.setControl(u);
    this.graphics.cart.opacity = params.ghost ? 0.3 : 1;
  }

  /**
   * LQR Params
   */
  lqrParams() {
    return {
      Q: matFromDiag([10, 1]),
      R: matFromDiag([1]),
      simEps: 1,
      simDuration: 4,
      disengage: false,
      divergenceThres: 1e10,
    }
  }

  /**
   * Plugin params
   */
  valueIterationParams() {
    return {
      x: { min: [-4, -5], max: [4, 5], nPts: [100, 100], targets: [[0, 0]]},
      u: { min: [-5], max: [5], nPts: [2] },
      dt: 0.05
    }
  }

  /**
   * Direct collocation params
   */
  directCollocationParams() {
    return {
      nPts: 20,
      uBounds: { min: [-5], max: [5] },
      anchors: [{ t: 0, x: [-2, 0] }, { t: 1, x: [2, 0] }],
      reverse: true
    }
  }

  /**
   * MPC Params
   */
  mpcParams() {
    return {
      nPts: 20,
      uBounds: { min: [-1], max: [5] },
      dt: 1 / 60,
      traj: bounceTraj
    }
  }

  /**
   * Kalman filter plugin parameters
   */
  kalmanFilterParams() {
    function measurement(params, x) {
      const pos = new eig.Matrix(params.pos)
      const x0 = new eig.Matrix([x.get(0), 0])
      const dist = pos.matSub(x0).norm();
      return new eig.Matrix([dist]);
    }
    return {
      covariance: [[5, 0], [0, 5]],
      processNoise: [[0, 0], [0, 0]],
      inputNoise: [[0, 0], [0, 0]],
      sensors: [
        { type: 'radar', dt: 1, pos: [-2, 2], measurement, noise: [[5]] }
      ]
    }
  }
}

const traj = []

export { traj }
export default SecondOrder