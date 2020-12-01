import eig from '@eigen'
import _ from 'lodash'
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { createCircularForce } from '../utils.js'

class SimplePendulum extends Model {
  static NAME = 'simple pendulum';
  static TAG = 'simplePendulum';
  static STATES = Object.freeze([
    { name: 'theta', show: true },
    { name: 'thetaDot', show: true, derivative: true },
  ])
  static COMMANDS = Object.freeze([
    { name: 'torque' }
  ])

  constructor(params = {}) {
    super(SimplePendulum.STATES, SimplePendulum.COMMANDS, {
      ...params,
      g: 9.81,
      l: 1,
      m: 1,
      mu: 0.5,
    })
    // const x = params.x0 || new eig.Matrix(2, 1);
    // eig.GC.set(this, 'x', x)
  }

  trim() {
    return {
      x: new eig.Matrix([Math.PI, 0]),
      u: new new eig.Matrix([0])
    }
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x)
    x.set(0, wrapAngle(x.get(0)))
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [theta, thetaDot]
    const p = this.params
    const dx = new eig.Matrix(2, 1);
    const s = Math.sin(x.get(0))
    const ddx = (-p.m * p.g * p.l * s - p.mu * x.get(1) + u.get(0)) / (p.m * Math.pow(p.l, 2))
    dx.set(0, x.get(1))
    dx.set(1, ddx)
    return dx
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params
    const c = Math.cos(x.get(0))
    return new eig.Matrix([
      [0, 1],
      [-p.g / p.l * c, - p.mu / p.m * p.l]
    ])
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    const p = this.params
    return new eig.Matrix([
      [0], [1 / p.m / sqr(p.l)]
    ])
  }

  /**
   * Mouse step
   * @param {Array} mouseTarget 
   * @param {Number} dt 
   */
  trackMouse(mouseTarget, dt) {
    const { u } = this.trim()
    const dx = this.dynamics(this.x, u)
    const theta = Math.atan2(mouseTarget[1], mouseTarget[0]) + Math.PI / 2
    this.x.set(1, 10 * wrapAngle(theta - this.x.get(0)))
    dx.set(0, this.x.get(1))
    dx.set(1, 0)
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    this.setState(newX)
    return { u }
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const COLOR = "#00897B";
    const COLOR_DARK = "#1565C0";

    const GEOM = {
      length: scale,
      thickness: 8,
      radius: 16,
    };

    // Create pole
    const pole = two.makeRectangle(
      0,
      GEOM.length / 2,
      GEOM.thickness,
      GEOM.length + GEOM.thickness
    );
    pole.fill = COLOR;
    pole.linewidth = 2;

    // Add counterweight
    const circle = two.makeCircle(0, GEOM.length, GEOM.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;

    this.graphics.pendulum = two.makeGroup(pole, circle);

    // Add forces
    const [force, setControl] = createCircularForce(two, GEOM.radius * 1.5, colors.red.base);
    this.graphics.pendulum.add(force);
    this.graphics.setControl = setControl;
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    // TODO: draw torque
    const { u } = params;
    const x = this.x;
    if (x) {
      this.graphics.pendulum.translation.set(...worldToCanvas([0, 0]));
      this.graphics.pendulum.rotation = -x.get(0);
    }
    if (u) {
      this.graphics.setControl(u.get(0) || 0);
    }
  }

  /**
   * LQR Params
   */
  lqrParams() {
    return {
      Q: matFromDiag([10, 1]),
      R: matFromDiag([1]),
      simEps: 1e-1,
      simDuration: 3,
      disengage: false,
      divergenceThres: 500,
    }
  }

  /**
   * Plugin params
   */
  valueIterationParams() {
    const maxThetaDot = 2 * Math.sqrt(this.params.g / this.params.l);
    return {
      x: {
        min: [-Math.PI, -maxThetaDot],
        max: [Math.PI, maxThetaDot],
        nPts: [100, 100],
        targets: [[Math.PI, 0], [-Math.PI, 0]]
      },
      u: { min: [-2], max: [2], nPts: [2] },
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
      anchors: [{ t: 0, x: [0, 0] }, { t: 1, x: [3.14, 0] }],
      holdTime: 1,
      reverse: true
    }
  }
}

export default SimplePendulum