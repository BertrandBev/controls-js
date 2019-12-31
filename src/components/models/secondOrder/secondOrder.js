import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { ValueIterationParams } from '@/components/planners/valueIterationPlanner.js'
import { matFromDiag } from '@/components/math.js'

class SecondOrder extends Model {
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
    return eig.Matrix.fromArray([
      x.vGet(1),
      u.vGet(0) / this.params.m
    ])
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    return eig.Matrix.fromArray([
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
    return eig.Matrix.fromArray([
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
    const xVel = 10 * (mouseTarget[0] - this.x.vGet(0));
    this.x.vSet(1, _.clamp(xVel, -15, 15))
    dx.vSet(0, this.x.vGet(1))
    // TODO: extract in schema
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    this.setState(newX)
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      cartWidth: scale,
      cartHeight: scale / 2
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
        const uh = _.clamp(u.vGet(0) * 5, -100, 100);
        side.group.visible = this.graphics.showControl && (idx - 0.5) * uh > 0;
        side.fHead.translation.x = (Math.sign(uh) * GEOM.cartWidth) / 2 + uh;
        side.fLine.vertices[1].x = side.fHead.translation.x;
      });
    };
    this.graphics.cart = two.makeGroup(
      cart,
      sides[0].group,
      sides[1].group
    );

    // Reference
    const ref = two.makeCircle(0, 0, 8)
    ref.fill = colors.purple.base;
    ref.stroke = colors.purple.darken3;
    ref.linewidth = 2
    this.graphics.ref = ref

    this.graphics.showRef = true
    this.graphics.setRef = (x, y) => {
      this.graphics.ref.visible = this.graphics.showRef
      this.graphics.ref.translation.x = x
      this.graphics.ref.translation.y = y
    }
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { u, trajX } = params
    const x = this.x;
    this.graphics.cart.translation.set(...worldToCanvas([x.vGet(0), 0]));
    this.graphics.setControl(u);
    this.graphics.showRef = !!trajX;
    if (trajX) this.graphics.setRef(...worldToCanvas([trajX.vGet(0), 0]))
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
    return new ValueIterationParams(
      [{ min: -4, max: 4, nPts: 50 }, { min: -5, max: 5, nPts: 50 }],
      [{ min: -2, max: 2, nPts: 2 }],
      [[0, 0]],
      0.11
    )
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
}

const traj = []

export { traj }
export default SecondOrder