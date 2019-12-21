import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { wrapAngle, sqr } from '@/components/math.js'

class DoublePendulum extends Model {
  static STATES = Object.freeze([
    { name: 'theta1', show: true },
    { name: 'theta2', show: true },
    { name: 'theta1Dot', derivative: true },
    { name: 'theta2Dot', derivative: true },
  ])

  static COMMANDS = Object.freeze([
    { name: 't1' },
    { name: 't2' }
  ])

  constructor(params = {}) {
    super(DoublePendulum.STATES, DoublePendulum.COMMANDS, params)
    this.params = {
      m1: 1,
      l1: 1,
      m2: 1,
      l2: 1,
      g: 9.8,
      mu: 0.2,
      ...params
    }
    // Init graphics
    this.graphics = {}
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    x.vSet(0, wrapAngle(x.vGet(0)))
    x.vSet(1, wrapAngle(x.vGet(1)))
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // https://diego.assencio.com/?index=1500c66ae7ab27bb0106467c68feebc6
    const p = this.params
    const [c1, s1] = [Math.cos(x.vGet(0)), Math.sin(x.vGet(0))]
    const [c2, s2] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const dt = x.vGet(0) - x.vGet(1)
    const [cdt, sdt] = [Math.cos(dt), Math.sin(dt)]
    const M = p.m2 / (p.m1 + p.m2)
    const a1 = p.l2 / p.l1 * M * cdt
    const a2 = p.l1 / p.l2 * cdt
    const t1 = -p.mu * x.vGet(2)
    const t2 = -p.mu * (x.vGet(3) - x.vGet(2))
    const f1 = -p.l2 / p.l1 * M * sqr(x.vGet(3)) * sdt - p.g / p.l1 * s1 + t1 / sqr(p.l1) / (p.m1 + p.m2)
    const f2 = p.l1 / p.l2 * sqr(x.vGet(2)) * sdt - p.g / p.l2 * s2 + t2 / p.m2 / sqr(p.l2)
    const g1 = (f1 - a1 * f2) / (1 - a1 * a2)
    const g2 = (-a2 * f1 + f2) / (1 - a1 * a2)
    return eig.Matrix.fromArray([
      x.vGet(2),
      x.vGet(3),
      g1,
      g2
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
   * Execute a step
   * @param {Matrix} u controls effort
   * @param {Number} dt delta time
   * @param {Array} mouseTarget optional mouse target
   */
  step(u, dt, mouseTarget) {
    const dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (mouseTarget) {
      const theta = Math.atan2(mouseTarget[1], mouseTarget[0]) + Math.PI / 2
      this.x.vSet(2, 10 * wrapAngle(theta - this.x.vGet(0)))
      dx.vSet(0, this.x.vGet(2))
      dx.vSet(2, 0)
    }
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    this.setState(newX)
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      length: scale,
      radius: 12,
      thickness: 4
    }
    // Create first pole
    const r1 = two.makeRectangle(
      0,
      GEOM.length / 2,
      GEOM.thickness,
      GEOM.length + GEOM.thickness
    );
    r1.fill = colors.purple.darken4;
    r1.noStroke();
    const c1 = two.makeCircle(0, GEOM.length, GEOM.radius);
    c1.fill = colors.purple.base;
    c1.linewidth = 0;
    const p1 = two.makeGroup(r1, c1)

    // Create second pole
    const r2 = two.makeRectangle(
      0,
      GEOM.length / 2,
      GEOM.thickness,
      GEOM.length + GEOM.thickness
    );
    r2.fill = colors.purple.darken4;
    r2.noStroke();
    const c2 = two.makeCircle(0, GEOM.length, GEOM.radius);
    c2.fill = colors.purple.base;
    c2.linewidth = 0;

    const p2 = two.makeGroup(r2, c2);
    p2.translation.set(0, GEOM.length);
    // Assemble poles
    const root = two.makeGroup(p2, p1);
    this.graphics = {
      root,
      p2
    };
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas) {
    const x = this.x;
    this.graphics.root.translation.set(...worldToCanvas([0, 0]))
    this.graphics.root.rotation = -x.vGet(0)
    this.graphics.p2.rotation = -(x.vGet(1) - x.vGet(0))
  }
}

export { DoublePendulum }