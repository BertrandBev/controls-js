/* eslint-disable */
// import eig from '../../lib/eigen-js/eigen.js'
const eig = require('../../lib/eigen-js/eigen.js')
import _ from 'lodash'

function wrapAngle(angle) {
  let mod = (angle + Math.PI) % (2 * Math.PI)
  if (mod < 0) { mod += 2 * Math.PI }
  return mod - Math.PI
}

class LQR {
  /**
   * Build a LQR controller to stabilize the system around x0
   * @param {Object} system system of interest
   * @param {Array} x0 equilibrium state
   * @param {Array} u0 equilibrium command
   */
  constructor(system, x0, u0) {
    this.system = system
    eig.GC.set(this, 'x0', x0)
    eig.GC.set(this, 'u0', u0)
    const [xn, un] = system.shape()
    const [Jx, Ju] = this.linearize(system, this.x0, this.u0)
    // Solve LQR
    const Q = eig.DenseMatrix.identity(xn, xn).mul(10);
    const R = eig.DenseMatrix.identity(un, un);
    const CareSolver = new eig.CareSolver(Jx, Ju, Q, R);
    eig.GC.set(this, 'K', CareSolver.K().transpose())
  }

  /**
   * Get command
   * @returns {Array} u command
   */
  getCommand() {
    const delta_x = this.x0.matSub(this.system.x)
    delta_x.vSet(0, wrapAngle(delta_x.vGet(0)))
    return delta_x.transpose().matMul(this.K)
  }

  /**
   * Linearize system about x0 & u0
   * @param {Object} system system of interest
   * @param {DenseMatrix} x0 equilibrium state
   * @param {DenseMatrix} u0 equilibrium command
   * @returns {DenseMatrix} [Jx, Ju]
   */
  linearize(system, x0, u0) {
    const eps = 10e-8
    const [xn, un] = system.shape()
    // TODO: extract in C lib ?
    function setCol(mat, row, vec) {
      for (let k = 0; k < vec.rows(); k++) {
        mat.set(k, row, vec.vGet(k))
      }
    }
    // Populate Jx matrix
    let Jx = new eig.DenseMatrix(xn, xn);
    for (let k = 0; k < xn; k += 1) {
      const x = new eig.DenseMatrix(x0);
      x.vSet(k, x.vGet(k) + eps);
      const dx = system.dynamics(x, u0).div(eps);
      setCol(Jx, k, dx)
    }
    // Populate Ju matrix
    let Ju = new eig.DenseMatrix(xn, un);
    for (let k = 0; k < un; k += 1) {
      const u = new eig.DenseMatrix(u0);
      u.vSet(k, u.vGet(k) + eps)
      const du = system.dynamics(x0, u).div(eps)
      setCol(Ju, k, du)
    }
    // Ignore return variables
    // eig.GC.ignore(Jx, Ju)
    Jx.print("Jx")
    Ju.print("Ju")
    return [Jx, Ju]
  }
}

class SimplePendulum {
  constructor(params = {}) {
    this.params = {
      g: 9.81,
      l: 1,
      m: 1,
      mu: 0,
      ...params
    }
    // Needs a copy contructor here to prevent deletion
    const x = new eig.DenseMatrix(params.x0) || new eig.DenseMatrix(2, 1);
    eig.GC.set(this, 'x', x)
    this.target = null
  }

  /**
   * Get the shape of a system
   * @returns {Array} shape [xn, un]
   */
  shape() {
    return [2, 1]
  }

  /**
   * Returns dx/dt
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} dx
   */
  dynamics(x, u) {
    // x = [theta, thetaDot]
    const p = this.params
    const dx = new eig.DenseMatrix(2, 1);
    const ddx = (-p.m * p.g * p.l * Math.sin(x.vGet(0)) - p.mu * x.vGet(1) + u.vGet(0)) / (p.m * Math.pow(p.l, 2))
    dx.vSet(0, x.vGet(1))
    dx.vSet(1, ddx)
    return dx
  }


  /**
   * Execute a step
   * @param {DenseMatrix} u controls effort
   * @param {Number} dt delta time
   */
  step(u, dt) {
    const dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (this.target) {
      const theta = -wrapAngle(Math.atan2(this.target.y, this.target.x) - Math.PI / 2)
      this.x.vSet(1, -10 * wrapAngle(this.x.vGet(0) - theta))
      dx.vSet(0, this.x.vGet(1))
      dx.vSet(1, 0)
    }
    // console.log('x', x, 'xDot', xDot)
    const newX = this.x.matAdd(dx.mul(dt))
    newX.vSet(0, wrapAngle(newX.vGet(0)))
    eig.GC.set(this, 'x', newX)
  }
}

export { LQR, SimplePendulum }