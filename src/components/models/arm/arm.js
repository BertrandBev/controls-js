import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js'
import chroma from 'chroma-js'
import { createMarker } from '../utils.js'
import { createCircularForce } from '../utils.js'

class Arm extends Model {
  static NAME = 'arm';
  static TAG = 'arm';

  constructor(params = {}) {
    // n is the number of links
    const n = params['n'] || 3;
    const states = [...Array(2 * n).keys()].map(k => ({
      name: k < n ? `theta${k}` : `theta${k - n}Dot`,
      show: k < n,
      derivative: k >= n
    }));
    const commands = [...Array(n).keys()].map(k => ({
      name: `t${k}`
    }));
    super(states, commands, {
      m: 1,
      l: 1,
      g: 9.8,
      n: n,
      mu: 0.4,
      ...params
    })
  }

  trim() {
    const n = this.params.n;
    const x = [...Array(2 * n).keys()].map(k => (
      k == 0 ? Math.PI : 0
    ));
    // const x = [Math.PI / 2, Math.PI / 2];
    const u = [...Array(n).keys()].map(() => 0);
    return {
      x: new eig.Matrix(x),
      u: new eig.Matrix(u)
    }
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x)
    for (let k = 0; k < this.params.n; k++)
      x.set(k, wrapAngle(x.get(k)));
  }


  /**
   * Helper function to build jacobians
   */
  jacobians(x) {
    // https://studywolf.wordpress.com/2013/09/02/robot-control-jacobians-velocity-and-force/
    const T = [], dT = []; // T_(i+1)(i); dT/dtheta
    for (let i = 0; i < this.params.n; i++) {
      const c = Math.cos(x.get(i));
      const s = Math.sin(x.get(i));
      const l = this.params.l;
      T.push(new eig.Matrix([
        [c, -s, c * l], [s, c, s * l], [0, 0, 1]
      ]));
      dT.push(new eig.Matrix([
        [-s, -c, -s * l], [c, -s, c * l], [0, 0, 0]
      ]));
    }
    // Compute jacobians
    const J = []; // J_i
    const pos = new eig.Matrix([0, 0, 1]);
    const Jacc = []; // dT_10/dtheta * T_21 * ...
    for (let i = 0; i < this.params.n; i++)
      Jacc.push(eig.Matrix.identity(3, 3));
    for (let i = 0; i < this.params.n; i++) {
      J.push(eig.Matrix(3, 0));
      for (let j = 0; j < this.params.n; j++) {
        Jacc[j].matMulSelf(j == i ? dT[i] : T[i]);
        J[i] = J[i].hcat(Jacc[j].matMul(pos).mul(j > i ? 0 : 1));
      }
    }
    return J;
  }


  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // https://scaron.info/teaching/equations-of-motion.html#case-of-manipulators
    // Build jacobians
    const J = this.jacobians(x);
    // Differenciate jacobians
    const dJ = [];
    const eps = 1e-10
    for (let i = 0; i < this.params.n; i++)
      dJ.push(eig.Matrix(3, this.params.n));
    for (let j = 0; j < this.params.n; j++) {
      const dx = eig.Matrix(x);
      dx.set(j, dx.get(j) + eps);
      const Jeps = this.jacobians(dx);

      const tDot = x.get(this.params.n + j);
      for (let i = 0; i < this.params.n; i++) {
        dJ[i].matAddSelf(Jeps[i].matSub(J[i]).mul(tDot / eps))
      }
    }

    // u = new eig.Matrix([0, -2])

    // Now compute the dynamics
    const M = eig.Matrix(this.params.n, this.params.n);
    const dqtC = eig.Matrix(this.params.n, this.params.n);
    const tauG = eig.Matrix(this.params.n, 1);
    const Jr = eig.Matrix(this.params.n, 1);
    const tauExt = eig.Matrix(this.params.n, 1);
    const g = new eig.Matrix([9.81, 0, 1]);
    for (let i = 0; i < this.params.n; i++) {
      const Jt = J[i].transpose();
      M.matAddSelf(Jt.matMul(J[i]).mul(this.params.m));
      dqtC.matAddSelf(Jt.matMul(dJ[i]).mul(this.params.m));
      tauG.matAddSelf(Jt.matMul(g).mul(this.params.m));
      Jr.set(i, 1);
      const tauF = x.get(this.params.n + i) * this.params.mu;
      tauExt.matAddSelf(Jr.mul(u.get(i) - tauF));
    }

    // Deduces the joint space acceleration vector
    const dq = x.block(this.params.n, 0, this.params.n, 1);
    const Minv = M.inverse();
    const dqtCdq = dqtC.matMul(dq);
    const d2q = Minv.matMul(tauG.matAdd(tauExt).matSub(dqtCdq));
    return dq.vcat(d2q);
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {

  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {

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
    for (let k = 0; k < this.params.n; k++) {
      const thetaCmd = k == 0 ? theta : 0;
      const xk = this.x.get(k);
      this.x.set(this.params.n + k, 10 * wrapAngle(thetaCmd - xk));
      dx.set(k, this.x.get(this.params.n + k));
      dx.set(this.params.n + k, 0);
    }
    // // TODO: extract in schema
    const newX = this.x.matAdd(dx.mul(dt));
    this.bound(newX);
    this.setState(newX);
    return { u };
  }

  static createPole(two, geom, fill) {
    const r1 = two.makeRectangle(
      0,
      geom.length / 2,
      geom.thickness,
      geom.length + geom.thickness
    );
    r1.fill = fill;
    r1.linewidth = 2;
    const c1 = two.makeCircle(0, geom.length, geom.radius);
    c1.fill = chroma(fill).darken(1);
    c1.linewidth = 2;
    return two.makeGroup(r1, c1)
  }

  static createArm(two, geom, fill, markerFill, n) {
    const arms = [];
    let arm = null;
    for (let k = 0; k < n; k++) {
      const p = Arm.createPole(two, geom, fill);
      if (!arm) {
        arm = p;
      } else {
        arm.translation.set(0, geom.length);
        arm = two.makeGroup(arm, p);
      }
      const { force, setControl } = createCircularForce(two, 3 * geom.radius / 2, colors.red.base);
      arm = two.makeGroup(arm, force);
      arms.push({ arm, setControl });
    }
    const marker = createMarker(two, 2 * geom.radius / 3, markerFill, 5);
    arms.push(two.makeGroup(arm, marker));
    arms.reverse();
    return arms;
  }

  static updateArm(graphics, worldToCanvas, x, u) {
    graphics[0].translation.set(...worldToCanvas([0, 0]))
    for (let k = 0; k < graphics.length - 1; k++) {
      graphics[k + 1].setControl(u ? u.get(k) : null);
      graphics[k + 1].arm.rotation = -x.get(k);
    }
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      length: scale,
      radius: 14,
      thickness: 8
    }

    // Assemble poles
    this.graphics = Arm.createArm(two, GEOM, colors.purple.lighten2, colors.indigo.darken4, this.params.n);
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { y, xRef, u } = params;
    Arm.updateArm(this.graphics, worldToCanvas, this.x, u);
  }

  /**
   * LQR Params
   */
  lqrParams() {
    const x0 = [...Array(2 * this.params.n).keys()].map(k => (k == 0 ? Math.PI : 0) + Math.PI / 8);
    const Q = [...Array(2 * this.params.n).keys()].map(k => k < this.params.n ? 10 : 1);
    const R = [...Array(this.params.n).keys()].map(k => 1);
    return {
      x0: x0,
      Q: matFromDiag(Q),
      R: matFromDiag(R),
      simEps: 1e-1,
      simDuration: 3,
      disengage: true,
      divergenceThres: 500,
    }
  }

  /**
   * RRT params
   */
  rrtParams() {
    const n = this.params.n;
    const xMin = [...Array(n)].map(_ => -Math.PI);
    const xMax = [...Array(n)].map(_ => Math.PI);
    const wrap = [...Array(n)].map(_ => true);
    const deltas = [...Array(n)].map(_ => Math.PI / 10);
    return {
      nPts: 400,
      n,
      xMin,
      xMax,
      wrap,
      deltas,
    }
  }
}

export default Arm