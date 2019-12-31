import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js'
import chroma from 'chroma-js'
import { ValueIterationParams } from '@/components/planners/valueIterationPlanner.js'

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
    super(DoublePendulum.STATES, DoublePendulum.COMMANDS, {
      m1: 1,
      l1: 1,
      m2: 1,
      l2: 1,
      g: 9.8,
      mu: 0.2,
      s2: 0,
      ...params
    })
  }

  trim() {
    return { x: eig.Matrix.fromArray([Math.PI, Math.PI, 0, 0]), u: eig.Matrix.fromArray([0, 0]) }
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x)
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
    const tau2 = -p.mu * (t2d - t1d) + p.s2 * u.vGet(1)
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
    let [u1, u2] = [u.vGet(0), u.vGet(1)]
    u2 *= p.s2;
    const [s1, s2] = [Math.sin(x.vGet(0)), Math.sin(x.vGet(1))]
    const dt = t1 - t2
    const [cdt, sdt] = [Math.cos(dt), Math.sin(dt)]
    // const M = p.m2 / (p.m1 + p.m2)
    // const L = p.l2 / p.l1;

    const c2dt = Math.cos(2 * t1 - 2 * t2)
    const s2dt = Math.sin(2 * t1 - 2 * t2)
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
      [0, 0], [0, 0], [dx1du1, dx1du2 * p.s2], [dx2du1, dx2du2 * p.s2]
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
    const theta = Math.atan2(mouseTarget[1], mouseTarget[0]) + Math.PI / 2
    this.x.vSet(2, 10 * wrapAngle(theta - this.x.vGet(0)))
    dx.vSet(0, this.x.vGet(2))
    dx.vSet(2, 0)
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
      length: scale,
      radius: 12,
      thickness: 4
    }

    function createPole(ref) {
      const r1 = two.makeRectangle(
        0,
        GEOM.length / 2,
        GEOM.thickness,
        GEOM.length + GEOM.thickness
      );
      r1.fill = chroma(colors.purple.darken4).alpha(ref ? 0.2 : 1);
      r1.noStroke();
      const c1 = two.makeCircle(0, GEOM.length, GEOM.radius);
      c1.fill = chroma(colors.purple.base).alpha(ref ? 0.2 : 1);
      c1.linewidth = 0;
      return two.makeGroup(r1, c1)
    }

    function createPendulum(ref) {
      const p1 = createPole(ref)
      const p2 = createPole(ref)
      p2.translation.set(0, GEOM.length);
      const root = two.makeGroup(p2, p1);
      return { root, p2 }
    }

    // Assemble poles
    this.graphics = {
      pendulum: createPendulum(false),
      ref: createPendulum(true)
    };
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { y, xRef } = params;
    [{ x: this.x, obj: 'pendulum' }, { x: xRef, obj: 'ref' }].forEach(({ x, obj }) => {
      const { root, p2 } = this.graphics[obj];
      if (x) {
        root.translation.set(...worldToCanvas([0, 0]))
        root.rotation = -x.vGet(0)
        p2.rotation = -(x.vGet(1) - x.vGet(0))
      }
      root.visible = !!x
    })
  }

  /**
   * LQR Params
   */
  lqrParams() {
    return {
      Q: matFromDiag([10, 10, 1, 1]),
      R: matFromDiag([1, 1]),
      simEps: 1e-1,
      simDuration: 4,
      disengage: true,
      divergenceThres: 500,
    }
  }

  /**
   * Direct collocation params
   */
  directCollocationParams() {
    return {
      nPts: 20,
      uBounds: { min: [-20, -20], max: [20, 20] },
      anchors: [{ t: 0, x: [0, 0, 0, 0] }, { t: 1, x: [3.14, 3.14, 0, 0] }],
      holdTime: 1,
      reverse: true
    }
  }
}

const traj = {
  dt: 0.055064710156302474,
  x: [[0.0000, 0.0000, 0.0000, 0.0000, -8.0000, 1.9841],
  [-0.0109, 0.0094, -0.3074, 0.1764, -8.0000, -6.4717],
  [-0.0286, 0.0088, -0.3155, -0.2277, -8.0000, -8.0000],
  [-0.0450, -0.0174, -0.2746, -0.7107, -8.0000, -8.0000],
  [-0.0594, -0.0695, -0.2444, -1.1558, -8.0000, -8.0000],
  [-0.0697, -0.1477, -0.0811, -1.6925, -1.9870, -8.0000],
  [-0.0620, -0.2630, 0.4222, -2.5014, 8.0000, -8.0000],
  [-0.0227, -0.4239, 0.9324, -3.2047, 8.0000, -8.0000],
  [0.0350, -0.6106, 1.0883, -3.4401, 7.6263, -8.0000],
  [0.0890, -0.7978, 0.7511, -3.2146, -7.7310, -8.0000],
  [0.1179, -0.9684, 0.3574, -2.9639, 4.4981, -8.0000],
  [0.1309, -1.1288, 0.0858, -2.7965, -1.4021, -8.0000],
  [0.1269, -1.2796, -0.2173, -2.6312, 0.3522, -8.0000],
  [0.1086, -1.4220, -0.4238, -2.4891, 2.8526, -7.9068],
  [0.0808, -1.5567, -0.5728, -2.3553, 1.6191, -8.0000],
  [0.0458, -1.6816, -0.6688, -2.0875, 2.5872, -3.0089],
  [0.0084, -1.7852, -0.6611, -1.6207, 2.3900, -0.9680],
  [-0.0256, -1.8622, -0.5364, -1.1735, 5.8332, -4.0566],
  [-0.0493, -1.9173, -0.3034, -0.8064, 7.4707, -4.2678],
  [-0.0583, -1.9510, -0.0121, -0.3866, 7.3620, -2.3829],
  [-0.0500, -1.9581, 0.3167, 0.1531, 7.9372, -0.3778],
  [-0.0227, -1.9303, 0.6637, 0.8860, 7.5154, 3.8879],
  [0.0226, -1.8552, 0.9415, 1.8513, 5.2840, 8.0000],
  [0.0784, -1.7230, 1.0223, 2.8896, 3.8599, 8.0000],
  [0.1317, -1.5347, 0.8499, 3.8751, 5.0804, 8.0000],
  [0.1681, -1.2965, 0.4229, 4.6140, 6.8291, -0.3244],
  [0.1709, -1.0211, -0.4450, 5.3864, -7.9946, 4.1623],
  [0.1056, -0.6826, -2.0233, 6.9673, -7.2062, 7.3529],
  [-0.0702, -0.2203, -4.2298, 9.6353, -7.8878, 7.5816],
  [-0.2986, 0.3144, -3.3557, 8.9036, -2.9276, 8.0000],
  [-0.4271, 0.7647, -1.3204, 7.4899, 0.4904, 8.0000],
  [-0.4507, 1.1671, 0.4593, 7.1032, 4.7102, 7.9945],
  [-0.3757, 1.5643, 2.2409, 7.2231, 7.5980, 7.9988],
  [-0.2024, 1.9721, 3.9575, 7.4171, 8.0000, 7.9979],
  [0.0583, 2.3836, 5.3364, 7.3061, 7.9992, 7.8589],
  [0.3811, 2.7761, 6.1736, 6.7312, 7.9576, 7.9943],
  [0.7347, 3.1250, 6.4549, 5.7572, 7.8758, 7.8078],
  [1.0909, 3.4117, 6.2899, 4.5215, 7.7247, 6.5486],
  [1.4292, 3.6258, 5.8403, 3.1675, 7.6932, 3.6728],
  [1.7384, 3.7653, 5.2660, 1.8706, 5.5778, 1.4795],
  [2.0114, 3.8333, 4.5008, 0.5502, -8.0000, -8.0000],
  [2.2390, 3.8313, 3.7176, -0.5327, -8.0000, -8.0000],
  [2.4288, 3.7820, 3.1347, -1.1838, -8.0000, -8.0000],
  [2.5902, 3.7045, 2.6879, -1.5692, -8.0000, -8.0000],
  [2.7294, 3.6103, 2.3274, -1.7975, -8.0000, -8.0000],
  [2.8502, 3.5061, 2.0255, -1.9435, -8.0000, -7.9957],
  [2.9552, 3.3955, 1.7506, -2.0138, -8.0000, -6.7318],
  [3.0454, 3.2825, 1.5030, -2.0605, -8.0000, -6.8582],
  [3.1163, 3.1796, 0.9207, -1.3842, -8.0000, 8.0000],
  [3.1416, 3.1416, 0.0000, 0.0000, -8.0000, 8.0000],
  [3.1163, 3.1796, -0.9207, 1.3842, -8.0000, -6.8582],
  [3.0454, 3.2825, -1.5030, 2.0605, -8.0000, -6.7318],
  [2.9552, 3.3955, -1.7506, 2.0138, -8.0000, -7.9957],
  [2.8502, 3.5061, -2.0255, 1.9435, -8.0000, -8.0000],
  [2.7294, 3.6103, -2.3274, 1.7975, -8.0000, -8.0000],
  [2.5902, 3.7045, -2.6879, 1.5692, -8.0000, -8.0000],
  [2.4288, 3.7820, -3.1347, 1.1838, -8.0000, -8.0000],
  [2.2390, 3.8313, -3.7176, 0.5327, -8.0000, -8.0000],
  [2.0114, 3.8333, -4.5008, -0.5502, 5.5778, 1.4795],
  [1.7384, 3.7653, -5.2660, -1.8706, 7.6932, 3.6728],
  [1.4292, 3.6258, -5.8403, -3.1675, 7.7247, 6.5486],
  [1.0909, 3.4117, -6.2899, -4.5215, 7.8758, 7.8078],
  [0.7347, 3.1250, -6.4549, -5.7572, 7.9576, 7.9943],
  [0.3811, 2.7761, -6.1736, -6.7312, 7.9992, 7.8589],
  [0.0583, 2.3836, -5.3364, -7.3061, 8.0000, 7.9979],
  [-0.2024, 1.9721, -3.9575, -7.4171, 7.5980, 7.9988],
  [-0.3757, 1.5643, -2.2409, -7.2231, 4.7102, 7.9945],
  [-0.4507, 1.1671, -0.4593, -7.1032, 0.4904, 8.0000],
  [-0.4271, 0.7647, 1.3204, -7.4899, -2.9276, 8.0000],
  [-0.2986, 0.3144, 3.3557, -8.9036, -7.8878, 7.5816],
  [-0.0702, -0.2203, 4.2298, -9.6353, -7.2062, 7.3529],
  [0.1056, -0.6826, 2.0233, -6.9673, -7.9946, 4.1623],
  [0.1709, -1.0211, 0.4450, -5.3864, 6.8291, -0.3244],
  [0.1681, -1.2965, -0.4229, -4.6140, 5.0804, 8.0000],
  [0.1317, -1.5347, -0.8499, -3.8751, 3.8599, 8.0000],
  [0.0784, -1.7230, -1.0223, -2.8896, 5.2840, 8.0000],
  [0.0226, -1.8552, -0.9415, -1.8513, 7.5154, 3.8879],
  [-0.0227, -1.9303, -0.6637, -0.8860, 7.9372, -0.3778],
  [-0.0500, -1.9581, -0.3167, -0.1531, 7.3620, -2.3829],
  [-0.0583, -1.9510, 0.0121, 0.3866, 7.4707, -4.2678],
  [-0.0493, -1.9173, 0.3034, 0.8064, 5.8332, -4.0566],
  [-0.0256, -1.8622, 0.5364, 1.1735, 2.3900, -0.9680],
  [0.0084, -1.7852, 0.6611, 1.6207, 2.5872, -3.0089],
  [0.0458, -1.6816, 0.6688, 2.0875, 1.6191, -8.0000],
  [0.0808, -1.5567, 0.5728, 2.3553, 2.8526, -7.9068],
  [0.1086, -1.4220, 0.4238, 2.4891, 0.3522, -8.0000],
  [0.1269, -1.2796, 0.2173, 2.6312, -1.4021, -8.0000],
  [0.1309, -1.1288, -0.0858, 2.7965, 4.4981, -8.0000],
  [0.1179, -0.9684, -0.3574, 2.9639, -7.7310, -8.0000],
  [0.0890, -0.7978, -0.7511, 3.2146, 7.6263, -8.0000],
  [0.0350, -0.6106, -1.0883, 3.4401, 8.0000, -8.0000],
  [-0.0227, -0.4239, -0.9324, 3.2047, 8.0000, -8.0000],
  [-0.0620, -0.2630, -0.4222, 2.5014, -1.9870, -8.0000],
  [-0.0697, -0.1477, 0.0811, 1.6925, -8.0000, -8.0000],
  [-0.0594, -0.0695, 0.2444, 1.1558, -8.0000, -8.0000],
  [-0.0450, -0.0174, 0.2746, 0.7107, -8.0000, -8.0000],
  [-0.0286, 0.0088, 0.3155, 0.2277, -8.0000, -6.4717],
  [-0.0109, 0.0094, 0.3074, -0.1764, -8.0000, 1.9841],
  [0.0000, 0.0000, 0.0000, 0.0000, -8.0000, 1.9841]]
}

export { traj }
export default DoublePendulum