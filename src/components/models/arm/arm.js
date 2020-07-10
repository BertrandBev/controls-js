import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js'
import chroma from 'chroma-js'

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
      mu: 0.2,
      ...params
    })
  }

  trim() {
    const n = this.params.n;
    const x = [...Array(2 * n).keys()].map(k => (
      k == 0 ? Math.PI * 0.5 : 0
    ));
    // const x = [Math.PI / 2, Math.PI / 2];
    const u = [...Array(n).keys()].map(() => 0);
    return {
      x: eig.Matrix.fromArray(x),
      u: eig.Matrix.fromArray(u)
    }
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x)
    for (let k = 0; k < this.params.n; k++)
      x.vSet(k, wrapAngle(x.vGet(k)));
  }


  /**
   * Helper function to build jacobians
   */
  jacobians(x) {
    // https://studywolf.wordpress.com/2013/09/02/robot-control-jacobians-velocity-and-force/
    const T = [], dT = []; // T_(i+1)(i); dT/dtheta
    for (let i = 0; i < this.params.n; i++) {
      const c = Math.cos(x.vGet(i));
      const s = Math.sin(x.vGet(i));
      const l = this.params.l;
      T.push(eig.Matrix.fromArray([
        [c, -s, c * l], [s, c, s * l], [0, 0, 1]
      ]));
      dT.push(eig.Matrix.fromArray([
        [-s, -c, -s * l], [c, -s, c * l], [0, 0, 0]
      ]));
    }
    // Compute jacobians
    const J = []; // J_i
    const pos = eig.Matrix.fromArray([0, 0, 1]);
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
      dx.vSet(j, dx.vGet(j) + eps);
      const Jeps = this.jacobians(dx);

      const tDot = x.vGet(this.params.n + j);
      for (let i = 0; i < this.params.n; i++) {
        dJ[i].matAddSelf(Jeps[i].matSub(J[i]).mul(tDot / eps))
      }
    }

    // u = eig.Matrix.fromArray([0, -2])

    // Now compute the dynamics
    const M = eig.Matrix(this.params.n, this.params.n);
    const dqtC = eig.Matrix(this.params.n, this.params.n);
    const tauG = eig.Matrix(this.params.n, 1);
    const Jr = eig.Matrix(this.params.n, 1);
    const tauExt = eig.Matrix(this.params.n, 1);
    const g = eig.Matrix.fromArray([9.81, 0, 1]);
    for (let i = 0; i < this.params.n; i++) {
      const Jt = J[i].transpose();
      M.matAddSelf(Jt.matMul(J[i]).mul(this.params.m));
      dqtC.matAddSelf(Jt.matMul(dJ[i]).mul(this.params.m));
      tauG.matAddSelf(Jt.matMul(g).mul(this.params.m));
      Jr.vSet(i, 1);
      const tauF = x.vGet(this.params.n + i) * this.params.mu;
      tauExt.matAddSelf(Jr.mul(u.vGet(i) - tauF));
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
    // const { u } = this.trim()
    // const dx = this.dynamics(this.x, u)
    // const theta = Math.atan2(mouseTarget[1], mouseTarget[0]) + Math.PI / 2
    // this.x.vSet(2, 10 * wrapAngle(theta - this.x.vGet(0)))
    // dx.vSet(0, this.x.vGet(2))
    // dx.vSet(2, 0)
    // // TODO: extract in schema
    // const newX = this.x.matAdd(dx.mul(dt))
    // this.bound(newX)
    // this.setState(newX)
    // return { u }
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

    const createPole = () => {
      const r1 = two.makeRectangle(
        0,
        GEOM.length / 2,
        GEOM.thickness,
        GEOM.length + GEOM.thickness
      );
      r1.fill = chroma(colors.purple.darken4).alpha(1);
      r1.noStroke();
      const c1 = two.makeCircle(0, GEOM.length, GEOM.radius);
      c1.fill = chroma(colors.purple.base).alpha(1);
      c1.linewidth = 0;
      return two.makeGroup(r1, c1)
    }

    const createArm = () => {
      const arms = [];
      let arm = null;
      for (let k = 0; k < this.params.n; k++) {
        const p = createPole();
        if (!arm) {
          arm = p;
          // arm.translation.set(0, GEOM.length);
          // arm = two.makeGroup(arm);
        } else {
          arm.translation.set(0, GEOM.length);
          arm = two.makeGroup(arm, p);
          console.log('translated by', GEOM.length);
        }
        arms.push(arm);
      }
      arms.reverse();
      return arms;
    }

    // Assemble poles
    this.graphics = createArm(false);
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { y, xRef } = params;
    this.graphics[0].translation.set(...worldToCanvas([0, 0]))
    for (let k = 0; k < this.graphics.length; k++) {
      this.graphics[k].rotation = -this.x.vGet(k);
    }
  }
}

export default Arm