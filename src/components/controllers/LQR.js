import eig from '@eigen'
import _ from 'lodash'
import Controller from './controller.js'
import LinearSystem from '@/components/models/linearSystem.js'

class LQR extends Controller {
  /**
   * Build a LQR controller to stabilize the system around x0
   * @param {Object} system system of interest
   * @param {Array} x0 equilibrium state
   * @param {Array} u0 equilibrium command
   */
  constructor(system, x0, u0) {
    super(system)
    this.system = system
    eig.GC.set(this, 'x0', x0)
    eig.GC.set(this, 'u0', u0)
    const [xn, un] = this.system.shape
  }

  ready() {
    return !!this.K
  }

  solve(params) {
    const [Jx, Ju] = LinearSystem.linearizeSystem(this.system, this.x0, this.u0)
    const Q = eig.Matrix.fromArray(params.Q)
    const R = eig.Matrix.fromArray(params.R)
    const sol = eig.Solvers.careSolve(Jx, Ju, Q, R);
    eig.GC.set(this, 'K', sol.K)
  }

  simulate(dx, dt, duration) {
    const xn = this.system.shape[0]
    const x0 = this.x0.matAdd(eig.Matrix.ones(xn, 1).mul(dx))
    const arr = this.system.simulate(this, x0, dt, duration)
    const xu0 = this.x0.vcat(this.u0)
    arr.forEach(x => x.matSubSelf(xu0))
    return arr
  }

  linearSimulate(dx, dt, duration) {
    const linsys = LinearSystem.fromModel(this.system, this.x0, this.u0)
    const xn = this.system.shape[0]
    const x0 = this.x0.matAdd(eig.Matrix.ones(xn, 1).mul(dx))
    const arr = linsys.simulate(this, x0, dt, duration)
    const xu0 = this.x0.vcat(this.u0)
    arr.forEach(x => x.matSubSelf(xu0))
    linsys.delete();
    return arr
  }

  /**
   * Get command
   * @returns {Array} u command
   */
  getCommand(x, t) {
    const delta_x = this.x0.matSub(x || this.system.x)
    this.system.bound(delta_x)
    return this.K.matMul(delta_x).matAdd(this.u0).clamp(-1000, 1000) // TODO: use system actuator limits
  }
}

export default LQR