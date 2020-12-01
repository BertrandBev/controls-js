import eig from '@eigen'
import Model from './model.js'

class LinearSystem extends Model {
  constructor(x0, u0, A, B, states, commands) {
    super(states, commands, {})
    eig.GC.set(this, 'x0', x0)
    eig.GC.set(this, 'u0', u0)
    eig.GC.set(this, 'A', A)
    eig.GC.set(this, 'B', B)
  }

  delete() {
    ['x0', 'u0', 'A', 'B'].forEach(k => eig.GC.popException(this[k]))
  }

  trim() {
    return { x: new eig.Matrix(this.shape[0], 1), u: new eig.Matrix(this.shape[1], 1) }
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    const dx = x.matSub(this.x0)
    const du = u.matSub(this.u0)
    return this.A.matMul(dx).matAdd(this.B.matMul(du))
  }

  /**
   * Create linear system from system
   * @param {Object} system 
   * @param {Matrix} x0 
   * @param {Matrix} u0 
   */
  static fromModel(system, x0, u0) {
    const [Jx, Ju] = LinearSystem.linearizeSystem(system, x0, u0)
    return new LinearSystem(x0, u0, Jx, Ju, system.states, system.commands)
  }

  /**
   * Linearize function about x0
   * @param {Function} fun function of interest
   * @param {Matrix} x0 equilibrium state
   * @returns {Matrix} A (df/dx at x0)
   */
  static linearize(fun, x0) {
    const eps = 1e-8
    const dx0 = fun(x0);
    const [m, n] = [dx0.rows(), x0.rows()]
    // TODO: extract in C lib ?
    function setCol(mat, row, vec) {
      for (let k = 0; k < vec.rows(); k++) {
        mat.set(k, row, vec.get(k))
      }
    }
    // Populate A matrix
    let A = new eig.Matrix(m, n);
    for (let k = 0; k < n; k += 1) {
      const x = new eig.Matrix(x0);
      x.set(k, x.get(k) + eps);
      const dx = fun(x).matSub(dx0).div(eps);
      setCol(A, k, dx);
    }
    return A;
  }

  /**
   * Linearize system about x0 & u0
   * @param {Object} system system of interest
   * @param {Matrix} x0 equilibrium state
   * @param {Matrix} u0 equilibrium command
   * @returns {Matrix} [Jx, Ju]
   */
  static linearizeSystem(system, x0, u0) {
    const Jx = LinearSystem.linearize(x => system.dynamics(x, u0), x0);
    const Ju = LinearSystem.linearize(u => system.dynamics(x0, u), u0);
    return [Jx, Ju]
  }

  /**
   * Test jacobian functions
   */
  static testJacobian(system) {
    const [xn, un] = system.shape
    const x0 = new eig.Matrix(xn, 1);
    for (let i = 0; i < xn; i++) {
      x0.set(i, i * 2.8 + 13.7);
    }
    const u0 = new eig.Matrix(un, 1);
    for (let i = 0; i < un; i++) {
      u0.set(i, i * 2.8 + 13.7);
    }
    const [Jxn, Jun] = LinearSystem.linearizeSystem(system, x0, u0)
    const Jx = system.xJacobian(x0, u0)
    const Ju = system.uJacobian(x0, u0)
    Jx.matSub(Jxn).print('Jx diff')
    Ju.matSub(Jun).print('Ju diff')
  }
}

export default LinearSystem