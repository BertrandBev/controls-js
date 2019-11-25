const eig = require('../../lib/eigen-js/eigen.js')
import _ from 'lodash'

function wrapAngle(angle) {
  let mod = (angle + Math.PI) % (2 * Math.PI)
  if (mod < 0) { mod += 2 * Math.PI }
  return mod - Math.PI
}

function sqr(val) {
  return Math.pow(val, 2)
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
    eig.GC.set(this, 'K', CareSolver.K())
  }

  /**
   * Get command
   * @returns {Array} u command
   */
  getCommand() {
    const delta_x = this.x0.matSub(this.system.x)
    this.system.bound(delta_x)
    return this.K.matMul(delta_x).matAdd(this.u0).clamp(-1000, 1000) // TODO: use system actuator limits
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

export {
  wrapAngle, LQR, sqr
}