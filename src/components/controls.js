const eig = require('@eigen')
import _ from 'lodash'

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
    const [Jx, Ju] = LQR.linearize(system, this.x0, this.u0)
    // Solve LQR
    const Q = eig.Matrix.identity(xn, xn).mul(10);
    const R = eig.Matrix.identity(un, un);
    const sol = eig.Solvers.careSolve(Jx, Ju, Q, R);
    eig.GC.set(this, 'K', sol.K)
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
   * @param {Matrix} x0 equilibrium state
   * @param {Matrix} u0 equilibrium command
   * @returns {Matrix} [Jx, Ju]
   */
  static linearize(system, x0, u0) {
    const eps = 10e-8
    const [xn, un] = system.shape()
    // Get nominal value
    const dx0 = system.dynamics(x0, u0)
    // TODO: extract in C lib ?
    function setCol(mat, row, vec) {
      for (let k = 0; k < vec.rows(); k++) {
        mat.set(k, row, vec.vGet(k))
      }
    }
    // Populate Jx matrix
    let Jx = new eig.Matrix(xn, xn);
    for (let k = 0; k < xn; k += 1) {
      const x = new eig.Matrix(x0);
      x.vSet(k, x.vGet(k) + eps);
      const dx = system.dynamics(x, u0).matSub(dx0).div(eps);
      setCol(Jx, k, dx)
    }
    // Populate Ju matrix
    let Ju = new eig.Matrix(xn, un);
    for (let k = 0; k < un; k += 1) {
      const u = new eig.Matrix(u0);
      u.vSet(k, u.vGet(k) + eps)
      const du = system.dynamics(x0, u).matSub(dx0).div(eps)
      setCol(Ju, k, du)
    }
    // Jx.print("Jx")
    // Ju.print("Ju")
    return [Jx, Ju]
  }

  /**
   * Test jacobian functions
   */
  static testJacobian(system) {
    const [xn, un] = system.shape()
    const x0 = new eig.Matrix(xn, 1);
    for (let i = 0; i < xn; i++) {
      x0.vSet(i, i * 2.8 + 13.7);
    }
    const u0 = new eig.Matrix(un, 1);
    for (let i = 0; i < un; i++) {
      u0.vSet(i, i * 2.8 + 13.7);
    }
    const [Jxn, Jun] = LQR.linearize(system, x0, u0)
    const Jx = system.xJacobian(x0, u0)
    const Ju = system.uJacobian(x0, u0)
    Jx.matSub(Jxn).print('Jx diff')
    Ju.matSub(Jun).print('Ju diff')
  }
}

export {
  LQR
}