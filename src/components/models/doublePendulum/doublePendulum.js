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
    const [t1, t2, t1d, t2d] = [x.vGet(0), x.vGet(1), x.vGet(2), x.vGet(3)]
    const [s1, s2] = [Math.sin(x.vGet(0)), Math.sin(x.vGet(1))]
    const dt = t1 - t2
    const [cdt, sdt] = [Math.cos(dt), Math.sin(dt)]
    const M = p.m2 / (p.m1 + p.m2)
    const L = p.l2 / p.l1;
    const a1 = L * M * cdt
    const a2 = cdt / L
    const tau1 = -p.mu * t1d + u.vGet(0)
    const tau2 = -p.mu * (t2d - t1d) + u.vGet(1)
    const f1 = -L * M * sqr(t2d) * sdt - p.g / p.l1 * s1 + tau1 / sqr(p.l1) / (p.m1 + p.m2)
    const f2 = sqr(t1d) * sdt / L - p.g / p.l2 * s2 + tau2 / p.m2 / sqr(p.l2)
    const g1 = (f1 - a1 * f2) / (1 - a1 * a2)
    const g2 = (-a2 * f1 + f2) / (1 - a1 * a2)
    return eig.Matrix.fromArray([
      t1d,
      t2d,
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
    const p = this.params
    const [t1, t2, t1d, t2d] = [x.vGet(0), x.vGet(1), x.vGet(2), x.vGet(3)]
    const [u1, u2] = [u.vGet(0), u.vGet(1)]
    const [s1, s2] = [Math.sin(x.vGet(0)), Math.sin(x.vGet(1))]
    const dt = t1 - t2
    const [cdt, sdt] = [Math.cos(dt), Math.sin(dt)]
    // const M = p.m2 / (p.m1 + p.m2)
    // const L = p.l2 / p.l1;

    const c2dt = Math.cos(2 * t1 - 2 * t2)
    const s2dt = Math.sin(2 * t1 - 2 * t2)
    // const cdtp1 = Math.cos(2 * t1 - t2)
    const cdtp2 = Math.cos(t1 - 2 * t2)
    const [c1, c2] = [Math.cos(t1), Math.cos(t2)]

    const dx1dt1 = ((p.g * c1) / p.l1 + (p.m2 * sqr(t1d) * sqr(cdt)) / (p.m1 + p.m2) - (p.l2 * p.m2 * sdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (p.l1 * (p.m1 + p.m2)) + (p.l2 * p.m2 * sqr(t2d) * cdt) / (p.l1 * (p.m1 + p.m2))) / ((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) + (2 * p.m2 * cdt * sdt * ((p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)) + (p.l2 * p.m2 * cdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (p.l1 * (p.m1 + p.m2)) + (p.l2 * p.m2 * sqr(t2d) * sdt) / (p.l1 * (p.m1 + p.m2)))) / (sqr((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) * (p.m1 + p.m2))
    const dx1dt2 = (2 * (p.m2 * cdt * sqr(p.l2) * sqr(t2d) + p.l1 * p.m2 * c2dt * p.l2 * sqr(t1d) + p.g * p.m2 * cdtp2 * p.l2 - p.mu * sdt * t1d + p.mu * sdt * t2d - u2 * sdt)) / (p.l1 * p.l2 * (2 * p.m1 + p.m2 - p.m2 * c2dt)) - (2 * p.m2 * cdt * sdt * (p.m1 + p.m2) * ((p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)) + (cdt * (p.l1 * p.l2 * p.m2 * sdt * sqr(t1d) + p.mu * t1d + u2 - p.mu * t2d - p.g * p.l2 * p.m2 * s2)) / (p.l1 * p.l2 * (p.m1 + p.m2)) + (p.l2 * p.m2 * sqr(t2d) * sdt) / (p.l1 * (p.m1 + p.m2)))) / sqr(- p.m2 * sqr(cdt) + p.m1 + p.m2)
    const dx1dt1d = -(p.l2 * p.m2 * t1d * s2dt * sqr(p.l1) + p.mu * cdt * p.l1 + p.l2 * p.mu) / (sqr(p.l1) * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)))
    const dx1dt2d = (- 2 * p.m2 * t2d * sdt * sqr(p.l2) + p.mu * cdt) / (p.l1 * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)))
    const dx2dt1 = - ((p.l1 * cdt * ((p.l2 * p.m2 * cdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * c1) / p.l1)) / p.l2 - (p.l1 * sdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * cdt) / p.l2) / ((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) - (2 * p.m2 * cdt * sdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * cdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (sqr((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) * (p.m1 + p.m2))
    const dx2dt2 = ((p.g * c2) / p.l2 - (p.l1 * sdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * cdt) / p.l2 + (p.m2 * sqr(t2d) * sqr(cdt)) / (p.m1 + p.m2)) / ((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) + (2 * p.m2 * cdt * sdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * cdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (sqr((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) * (p.m1 + p.m2))
    const dx2dt1d = ((p.m1 + p.m2) * (p.mu / (sqr(p.l2) * p.m2) + (2 * p.l1 * t1d * sdt) / p.l2) + (p.mu * cdt) / (p.l1 * p.l2)) / (p.m1 + p.m2 - p.m2 * sqr(cdt))
    const dx2dt2d = -(- t2d * s2dt * sqr(p.l2) * sqr(p.m2) + p.mu * p.m2 + p.m1 * p.mu) / (sqr(p.l2) * p.m2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)))

    return eig.Matrix.fromArray([
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [dx1dt1, dx1dt2, dx1dt1d, dx1dt2d],
      [dx2dt1, dx2dt2, dx2dt1d, dx2dt2d]
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
    const [t1, t2] = [x.vGet(0), x.vGet(1)]
    const dt = t1 - t2
    const cdt = Math.cos(dt)
    const dx1du1 = 1 / (sqr(p.l1) * (p.m1 + p.m2 - p.m2 * sqr(cdt)))
    const dx1du2 = -cdt / (p.l1 * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)))
    const dx2du1 = -cdt / (p.l1 * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)))
    const dx2du2 = (p.m1 + p.m2) / (sqr(p.l2) * p.m2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)))
    return eig.Matrix.fromArray([
      [0, 0], [0, 0], [dx1du1, dx1du2], [dx2du1, dx2du2]
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