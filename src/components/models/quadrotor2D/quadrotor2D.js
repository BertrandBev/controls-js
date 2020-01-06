import eig from '@eigen'
import _ from 'lodash'
import chroma from 'chroma-js'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js'

class Quadrotor2D extends Model {
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'y', show: true },
    { name: 'theta', show: true },
    { name: 'yDot', derivative: true },
    { name: 'xDot', derivative: true },
    { name: 'thetaDot', derivative: true },
  ])

  static COMMANDS = Object.freeze([
    { name: 't1' },
    { name: 't2' }
  ])

  constructor(params = {}) {
    super(Quadrotor2D.STATES, Quadrotor2D.COMMANDS, {
      g: 9.81,
      l: 1,
      m: 1,
      I: 1,
      // mu: 0.5, TODO: add natural damping
      ...params
    })
  }

  trim() {
    const u0 = this.params.g * this.params.m / 2
    return { x: new eig.Matrix(6, 1), u: eig.Matrix.fromArray([u0, u0]) }
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    x.vSet(2, wrapAngle(x.vGet(2)))
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [x, y, theta, dx, dy, dtheta]
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const [u1, u2] = [u.vGet(0), u.vGet(1)]
    const ddx = eig.Matrix.fromArray([
      -(u1 + u2) * s / p.m,
      (u1 + u2) * c / p.m - p.g,
      p.l / 2 * (u1 - u2) / p.I
    ])
    const dx = x.block(3, 0, 3, 1)
    return dx.vcat(ddx)
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const [u1, u2] = [u.vGet(0), u.vGet(1)]
    const dx2dt = -(u1 + u2) * c / p.m
    const dy2dt = -(u1 + u2) * s / p.m
    return eig.Matrix.fromArray([
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
      [0, 0, dx2dt, 0, 0, 0],
      [0, 0, dy2dt, 0, 0, 0],
      [0, 0, 0, 0, 0, 0]
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
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const dx2du1 = -s / p.m
    const dy2du1 = c / p.m
    const dt2du1 = p.l / 2 / p.I
    return eig.Matrix.fromArray([
      [0, 0], [0, 0], [0, 0], [dx2du1, dx2du1], [dy2du1, dy2du1], [dt2du1, -dt2du1]
    ])
  }

  /**
   * Mouse step
   * @param {Number} dt 
   * @param {Array} mouseTarget 
   */
  trackMouse(mouseTarget, dt) {
    // const { u } = this.trim()
    const dxo = eig.Matrix.fromArray([
      mouseTarget[0] - this.x.vGet(0),
      mouseTarget[1] - this.x.vGet(1),
      -this.x.vGet(2)
    ]).mul(10).clamp(-10, 10)
    const dx = dxo.vcat(new eig.Matrix(3, 1))
    this.x.setBlock(3, 0, dxo.block(0, 0, 3, 1))
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
      thickness: 8,
      length: scale
    };

    const body = two.makeRectangle(0, 0, GEOM.length, GEOM.thickness);
    body.fill = colors.blue.base;
    body.linewidth = 2;

    // Create propellers
    const propHeight = -1.5 * GEOM.thickness;
    const propLength = GEOM.length / 4;
    this.graphics.force = [null, null];
    const sides = [(3 * GEOM.length) / 7, (-3 * GEOM.length) / 7].map(x => {
      const prop = two.makeLine(
        x - propLength,
        propHeight,
        x + propLength,
        propHeight
      );
      prop.linewidth = 3;
      prop.fill = colors.green.base;
      const shaft = two.makeLine(x, -3, x, propHeight);
      shaft.linewidth = 2;
      shaft.fill = colors.green.base;
      // Motors?

      // Forces
      const fLine = two.makeLine(x, propHeight, x, propHeight - 10);
      fLine.linewidth = 2;
      fLine.stroke = colors.red.base;
      const fHead = two.makePolygon(x, propHeight - 10, 6, 3);
      fHead.fill = colors.red.base;

      return {
        prop: two.makeGroup(prop, shaft, fLine, fHead),
        fLine,
        fHead
      };
    });
    this.graphics.showControl = true
    this.graphics.setControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.vGet(idx) * 5, -100, 100);
        side.fHead.translation.y = propHeight - uh;
        side.fHead.rotation = uh > 0 ? 0 : Math.PI;
        side.fLine.vertices[1].y = side.fHead.translation.y;
        side.fHead.visible = side.fLine.visible = this.graphics.showControl
      });
    };
    // const trajLines = [...Array(20)].map(() => {
    //   const line = two.makeLine(0, 0, 0, 0);
    //   return line;
    // });
    // this.graphics.showTraj = traj => {
    //   traj.forEach((x, idx) => {
    //     const xy = this.worldToCanvas([x.vGet(0), x.vGet(1)]);
    //     trajLines[idx].vertices[0].x = xy[0];
    //     trajLines[idx].vertices[0].y = xy[1];
    //     trajLines[idx].vertices[1].x = xy[0];
    //     trajLines[idx].vertices[1].y = xy[1];
    //     if (idx > 0) {
    //       trajLines[idx - 1].vertices[1].x = xy[0];
    //       trajLines[idx - 1].vertices[1].y = xy[1];
    //     }
    //   });
    // };
    this.graphics.system = two.makeGroup(
      body,
      sides[0].prop,
      sides[1].prop
    );
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { u } = params;
    const x = this.x
    this.graphics.system.translation.set(...worldToCanvas([x.vGet(0), x.vGet(1)]))
    this.graphics.system.rotation = -x.vGet(2)
    this.graphics.setControl(u)
  }

  /**
   * LQR Params
   */
  lqrParams() {
    return {
      Q: matFromDiag([10, 10, 10, 1, 1, 1]),
      R: matFromDiag([1, 1]),
      simEps: 1,
      simDuration: 4,
      disengage: true,
      divergenceThres: 200,
    }
  }

  /**
   * Direct collocation params
   */
  directCollocationParams() {
    return {
      nPts: 20,
      uBounds: { min: [0, 0], max: [20, 20] },
      anchors: [{ t: 0, x: [0, 0, 0, 0, 0, 0] }, { t: 1, x: [0, 1, 0, 0, 0, 0] }],
      holdTime: 1,
      reverse: true
    }
  }

  /**
   * TODO: add to shared lib
   * @param {Array} traj 
   * @param {Number} dt 
   * @param {Number} tau Decay characteristic time for low-pass
   */
  differenciate(traj, dt, tau = 1e-8, loop = false) {
    const dTraj = []
    for (let k = 0; k < traj.length; k++) {
      const div = traj[(k + 1) % traj.length].matSub(traj[k % traj.length]).div(dt)
      dTraj.push(div)
    }
    return this.smooth(dTraj, dt, tau)
  }

  /**
   * 
   * @param {Array} trah 
   * @param {Number} tau Decay characteristic time for low-pass
   */
  smooth(traj, dt, tau = 1e-8) {
    if (traj.length === 0) {
      return []
    }
    const decay = Math.exp(-2 * Math.PI * dt / tau)
    let val = traj[0]
    const smoothed = []
    for (let k = 0; k < 2 * traj.length; k++) {
      val = val.mul(decay).matAdd(traj[k % traj.length].mul(1 - decay))
      if (k >= traj.length) {
        smoothed.push(val)
      }
    }
    return smoothed
  }

  /**
   * Differential flatness solution for an x, y trajectory
   * @returns [x; u]
   */
  differentialFlatness(xy, dt) {
    const p = this.params
    // Differenciate trajectory
    xy = this.smooth(xy, dt, 1)
    const dxy = this.differenciate(xy, dt, 1, true)
    const ddxy = this.differenciate(dxy, dt, 1, true)
    const theta = ddxy.map(val => {
      const t = Math.atan(-val.vGet(0) / (val.vGet(1) + p.g))
      return eig.Matrix.fromArray([t])
    })
    const dtheta = this.differenciate(theta, dt, 1, true)
    const ddtheta = this.differenciate(dtheta, dt, 1, true)
    return xy.map((val, idx) => {
      // compute u
      const a = p.m * Math.sqrt(sqr(ddxy[idx].vGet(0)) + sqr(ddxy[idx].vGet(1) + p.g)) / 2
      const b = p.I * ddtheta[idx].vGet(0) / p.l
      const u = eig.Matrix.fromArray([a + b, a - b])
      return val.vcat(theta[idx]).vcat(dxy[idx]).vcat(dtheta[idx]).vcat(u)
    })
  }
}

const traj = []

export { traj }
export default Quadrotor2D