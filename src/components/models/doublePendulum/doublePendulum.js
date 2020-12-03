import eig from '@eigen';
import _ from 'lodash';
import colors from 'vuetify/lib/util/colors';
import Model from '@/components/models/model.js';
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js';
import Arm from '../arm/arm.js';
import { swingup, swingupMPC } from './trajectories.js';
import { createTraj } from '../utils.js';

class DoublePendulum extends Model {
  static NAME = 'double pendulum';
  static TAG = 'doublePendulum';
  static STATES = Object.freeze([
    { name: 'theta1', show: true },
    { name: 'theta2', show: true },
    { name: 'theta1Dot', derivative: true },
    { name: 'theta2Dot', derivative: true },
  ]);
  static COMMANDS = Object.freeze([
    { name: 't1' },
    { name: 't2' }
  ]);

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
    });
  }

  trim() {
    return {
      x: new eig.Matrix([Math.PI, Math.PI, 0, 0]),
      u: new eig.Matrix([0, 0])
    };
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x);
    x.set(0, wrapAngle(x.get(0)));
    x.set(1, wrapAngle(x.get(1)));
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // https://diego.assencio.com/?index=1500c66ae7ab27bb0106467c68feebc6
    const p = this.params;
    const [t1, t2, t1d, t2d] = [x.get(0), x.get(1), x.get(2), x.get(3)];
    const [s1, s2] = [Math.sin(x.get(0)), Math.sin(x.get(1))];
    const dt = t1 - t2;
    const [cdt, sdt] = [Math.cos(dt), Math.sin(dt)];
    const M = p.m2 / (p.m1 + p.m2);
    const L = p.l2 / p.l1;
    const a1 = L * M * cdt;
    const a2 = cdt / L;
    const tau1 = -p.mu * t1d + u.get(0);
    const tau2 = -p.mu * (t2d - t1d) + p.s2 * u.get(1);
    const f1 = -L * M * sqr(t2d) * sdt - p.g / p.l1 * s1 + tau1 / sqr(p.l1) / (p.m1 + p.m2);
    const f2 = sqr(t1d) * sdt / L - p.g / p.l2 * s2 + tau2 / p.m2 / sqr(p.l2);
    const g1 = (f1 - a1 * f2) / (1 - a1 * a2);
    const g2 = (-a2 * f1 + f2) / (1 - a1 * a2);
    return new eig.Matrix([
      t1d,
      t2d,
      g1,
      g2
    ]);
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params;
    const [t1, t2, t1d, t2d] = [x.get(0), x.get(1), x.get(2), x.get(3)];
    let [u1, u2] = [u.get(0), u.get(1)];
    u2 *= p.s2;
    const [s1, s2] = [Math.sin(x.get(0)), Math.sin(x.get(1))];
    const dt = t1 - t2;
    const [cdt, sdt] = [Math.cos(dt), Math.sin(dt)];
    // const M = p.m2 / (p.m1 + p.m2)
    // const L = p.l2 / p.l1;

    const c2dt = Math.cos(2 * t1 - 2 * t2);
    const s2dt = Math.sin(2 * t1 - 2 * t2);
    const cdtp2 = Math.cos(t1 - 2 * t2);
    const [c1, c2] = [Math.cos(t1), Math.cos(t2)];

    const dx1dt1 = ((p.g * c1) / p.l1 + (p.m2 * sqr(t1d) * sqr(cdt)) / (p.m1 + p.m2) - (p.l2 * p.m2 * sdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (p.l1 * (p.m1 + p.m2)) + (p.l2 * p.m2 * sqr(t2d) * cdt) / (p.l1 * (p.m1 + p.m2))) / ((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) + (2 * p.m2 * cdt * sdt * ((p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)) + (p.l2 * p.m2 * cdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (p.l1 * (p.m1 + p.m2)) + (p.l2 * p.m2 * sqr(t2d) * sdt) / (p.l1 * (p.m1 + p.m2)))) / (sqr((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) * (p.m1 + p.m2));
    const dx1dt2 = (2 * (p.m2 * cdt * sqr(p.l2) * sqr(t2d) + p.l1 * p.m2 * c2dt * p.l2 * sqr(t1d) + p.g * p.m2 * cdtp2 * p.l2 - p.mu * sdt * t1d + p.mu * sdt * t2d - u2 * sdt)) / (p.l1 * p.l2 * (2 * p.m1 + p.m2 - p.m2 * c2dt)) - (2 * p.m2 * cdt * sdt * (p.m1 + p.m2) * ((p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)) + (cdt * (p.l1 * p.l2 * p.m2 * sdt * sqr(t1d) + p.mu * t1d + u2 - p.mu * t2d - p.g * p.l2 * p.m2 * s2)) / (p.l1 * p.l2 * (p.m1 + p.m2)) + (p.l2 * p.m2 * sqr(t2d) * sdt) / (p.l1 * (p.m1 + p.m2)))) / sqr(- p.m2 * sqr(cdt) + p.m1 + p.m2);
    const dx1dt1d = -(p.l2 * p.m2 * t1d * s2dt * sqr(p.l1) + p.mu * cdt * p.l1 + p.l2 * p.mu) / (sqr(p.l1) * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)));
    const dx1dt2d = (- 2 * p.m2 * t2d * sdt * sqr(p.l2) + p.mu * cdt) / (p.l1 * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)));
    const dx2dt1 = - ((p.l1 * cdt * ((p.l2 * p.m2 * cdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * c1) / p.l1)) / p.l2 - (p.l1 * sdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * cdt) / p.l2) / ((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) - (2 * p.m2 * cdt * sdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * cdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (sqr((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) * (p.m1 + p.m2));
    const dx2dt2 = ((p.g * c2) / p.l2 - (p.l1 * sdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * cdt) / p.l2 + (p.m2 * sqr(t2d) * sqr(cdt)) / (p.m1 + p.m2)) / ((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) + (2 * p.m2 * cdt * sdt * ((u2 + p.mu * (t1d - t2d)) / (sqr(p.l2) * p.m2) - (p.g * s2) / p.l2 + (p.l1 * cdt * ((p.l2 * p.m2 * sdt * sqr(t2d)) / (p.l1 * (p.m1 + p.m2)) + (p.g * s1) / p.l1 - (u1 - p.mu * t1d) / (sqr(p.l1) * (p.m1 + p.m2)))) / p.l2 + (p.l1 * sqr(t1d) * sdt) / p.l2)) / (sqr((p.m2 * sqr(cdt)) / (p.m1 + p.m2) - 1) * (p.m1 + p.m2));
    const dx2dt1d = ((p.m1 + p.m2) * (p.mu / (sqr(p.l2) * p.m2) + (2 * p.l1 * t1d * sdt) / p.l2) + (p.mu * cdt) / (p.l1 * p.l2)) / (p.m1 + p.m2 - p.m2 * sqr(cdt));
    const dx2dt2d = -(- t2d * s2dt * sqr(p.l2) * sqr(p.m2) + p.mu * p.m2 + p.m1 * p.mu) / (sqr(p.l2) * p.m2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)));

    return new eig.Matrix([
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [dx1dt1, dx1dt2, dx1dt1d, dx1dt2d],
      [dx2dt1, dx2dt2, dx2dt1d, dx2dt2d]
    ]);
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    const p = this.params;
    const [t1, t2] = [x.get(0), x.get(1)];
    const dt = t1 - t2;
    const cdt = Math.cos(dt);
    const dx1du1 = 1 / (sqr(p.l1) * (p.m1 + p.m2 - p.m2 * sqr(cdt)));
    const dx1du2 = -cdt / (p.l1 * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)));
    const dx2du1 = -cdt / (p.l1 * p.l2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)));
    const dx2du2 = (p.m1 + p.m2) / (sqr(p.l2) * p.m2 * (p.m1 + p.m2 - p.m2 * sqr(cdt)));
    return new eig.Matrix([
      [0, 0], [0, 0], [dx1du1, dx1du2 * p.s2], [dx2du1, dx2du2 * p.s2]
    ]);
  }

  /**
   * Mouse step
   * @param {Array} mouseTarget 
   * @param {Number} dt 
   */
  trackMouse(mouseTarget, dt) {
    const { u } = this.trim();
    const dx = this.dynamics(this.x, u);
    const theta = Math.atan2(mouseTarget[1], mouseTarget[0]) + Math.PI / 2;
    this.x.set(2, 10 * wrapAngle(theta - this.x.get(0)));
    this.x.set(3, 10 * wrapAngle(this.x.get(0) - this.x.get(1)));
    dx.set(0, this.x.get(2));
    dx.set(2, 0);
    // TODO: extract in schema
    const newX = this.x.matAdd(dx.mul(dt));
    this.bound(newX);
    this.setState(newX);
    return { u };
  }


  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      length: scale,
      radius: 14,
      thickness: 8
    };
    this.graphics.arm = Arm.createArm(two, GEOM, colors.indigo.lighten2, colors.indigo.darken4, 2);
    // Create traj
    this.graphics.scale = scale;
    this.graphics.traj = createTraj(two, this.mpcParams().nPts);
    this.graphics.trajSup = createTraj(two, this.mpcParams().nPts);
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { y, xRef, u, ghost } = params;
    const xShift = eig.Matrix(this.x);
    xShift.set(1, xShift.get(1) - xShift.get(0));
    this.graphics.arm[0].opacity = ghost ? 0.3 : 1;
    Arm.updateArm(this.graphics.arm, worldToCanvas, xShift, u);
    const center = worldToCanvas([0, 0]);
    this.graphics.traj.update((pt) => {
      return [
        center[0] + this.graphics.scale * Math.sin(pt.get(0)),
        center[1] + this.graphics.scale * Math.cos(pt.get(0))
      ];
    });
    this.graphics.trajSup.data = this.graphics.traj.data;
    this.graphics.trajSup.update((pt) => {
      return [
        center[0] + this.graphics.scale * (Math.sin(pt.get(0)) + Math.sin(pt.get(1))),
        center[1] + this.graphics.scale * (Math.cos(pt.get(0)) + Math.cos(pt.get(1)))
      ];
    });
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
    };
  }

  /**
   * Direct collocation params
   */
  directCollocationParams() {
    return {
      nPts: 30,
      uBounds: { min: [-20, -0], max: [20, 0] },
      anchors: [{ t: 0, x: [0, 0, 0, 0] }, { t: 1, x: [3.14, 3.14, 0, 0] }],
      holdTime: 1,
      reverse: true,
      traj: swingup
    };
  }

  /**
  * MPC Params
  */
  mpcParams() {
    return {
      nPts: 20,
      uBounds: { min: [-20, -0], max: [20, 0] },
      dt: 1 / 10,
      traj: swingupMPC
    };
  }
}

export default DoublePendulum;