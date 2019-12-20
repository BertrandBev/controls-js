import eig from '@eigen'
import _ from 'lodash'
import LQR, { wrapAngle, sqr } from './controllers/LQR.js'

class Acrobot {
  constructor(params = {}) {
    this.params = {
      g: 9.81,
      l1: 1,
      l2: 1,
      lc1: 0.5,
      lc2: 0.5,
      m1: 1,
      m2: 1,
      I1: 1,
      I2: 1,
      mu1: 0.5,
      mu2: 0.5,
      ...params
    }
    this.params = {
      g: 9.81,
      l1: 1,
      l2: 1,
      lc1: 0.5,
      lc2: 0.5,
      m1: 1,
      m2: 1,
      I1: 1,
      I2: 1,
      mu1: 0.5,
      mu2: 0.5,
      ...params
    }
    const x = params.x0 || new eig.Matrix(4, 1);
    eig.GC.set(this, 'x', x);
    this.target = null
  }

  /**
   * Get the shape of a system
   * @returns {Array} shape [xn, un]
   */
  shape() {
    return [4, 1]
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [theta1, theta2, dtheta1, dtheta2]
    const p = this.params
    const [c1, s1] = [Math.cos(x.vGet(0)), Math.sin(x.vGet(0))]
    const [c2, s2] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const [q1, q2] = [x.vGet(2), x.vGet(3)]
    const s12 = Math.sin(x.vGet(0) + x.vGet(1))

    // Mass matrix
    const M = eig.Matrix.fromArray([[
      p.I1 + p.I2 + p.m2 * sqr(p.l1) + 2 * p.m2 * p.l1 * p.lc2 * c2,
      p.I2 + p.m2 * p.l1 * p.lc2 * c2
    ], [
      p.I2 + p.m2 * p.l1 * p.lc2 * c2,
      p.I2
    ]])
    const Minv = M.inverse()
    // Coriolis matrix
    const C = eig.Matrix.fromArray([[
      -2 * p.m2 * p.l1 * p.lc2 * s2 * q2, -p.m2 * p.l1 * p.lc2 * s2 * q2
    ], [
      p.m2 * p.l1 * p.lc2 * s2 * q1, 0
    ]])
    // Gravity matrix
    const G = eig.Matrix.fromArray([
      -p.m1 * p.g * p.lc1 * s1 - p.m2 * p.g * (p.l1 * s1 + p.lc2 * s12),
      - p.m2 * p.g * p.l2 * s12
    ])
    // Controls matrix
    const B = eig.Matrix.fromArray([0, 1])
    // Damping matrix
    const D = eig.Matrix.fromArray([[-p.mu1, 0], [0, -p.mu2]])
    // From standard manipulator form
    // M(q)ddq + C(q, dq)dq = Tg(q) + Bu
    // http://underactuated.mit.edu/underactuated.html?chapter=acrobot
    const dx = eig.Matrix.fromArray([q1, q2])
    const ddx = Minv.matMul(G.matAdd(B.matMul(u)).matSub(C.matMul(dx))).matAdd(D.matMul(dx))
    return dx.vcat(ddx)
  }


  /**
   * Execute a step
   * @param {Matrix} u controls effort
   * @param {Number} dt delta time
   */
  step(u, dt) {
    const dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (this.target) {
      const theta = -wrapAngle(Math.atan2(this.target.y, this.target.x) - Math.PI / 2)
      this.x.vSet(2, -10 * wrapAngle(this.x.vGet(0) - theta))
      this.x.vSet(3, -10 * wrapAngle(this.x.vGet(1)))
      dx.vSet(0, this.x.vGet(2))
      dx.vSet(1, this.x.vGet(3))
      dx.vSet(2, 0)
      dx.vSet(3, 0)
    }
    // console.log('x', x, 'xDot', xDot)
    const newX = this.x.matAdd(dx.mul(dt))
    newX.vSet(0, wrapAngle(newX.vGet(0)))
    newX.vSet(1, wrapAngle(newX.vGet(1)))
    eig.GC.set(this, 'x', newX)
  }
}

export { Acrobot }