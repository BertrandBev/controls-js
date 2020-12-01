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
    const [c1, s1] = [Math.cos(x.get(0)), Math.sin(x.get(0))]
    const [c2, s2] = [Math.cos(x.get(1)), Math.sin(x.get(1))]
    const [q1, q2] = [x.get(2), x.get(3)]
    const s12 = Math.sin(x.get(0) + x.get(1))

    // Mass matrix
    const M = new eig.Matrix([[
      p.I1 + p.I2 + p.m2 * sqr(p.l1) + 2 * p.m2 * p.l1 * p.lc2 * c2,
      p.I2 + p.m2 * p.l1 * p.lc2 * c2
    ], [
      p.I2 + p.m2 * p.l1 * p.lc2 * c2,
      p.I2
    ]])
    const Minv = M.inverse()
    // Coriolis matrix
    const C = new eig.Matrix([[
      -2 * p.m2 * p.l1 * p.lc2 * s2 * q2, -p.m2 * p.l1 * p.lc2 * s2 * q2
    ], [
      p.m2 * p.l1 * p.lc2 * s2 * q1, 0
    ]])
    // Gravity matrix
    const G = new eig.Matrix([
      -p.m1 * p.g * p.lc1 * s1 - p.m2 * p.g * (p.l1 * s1 + p.lc2 * s12),
      - p.m2 * p.g * p.l2 * s12
    ])
    // Controls matrix
    const B = new eig.Matrix([0, 1])
    // Damping matrix
    const D = new eig.Matrix([[-p.mu1, 0], [0, -p.mu2]])
    // From standard manipulator form
    // M(q)ddq + C(q, dq)dq = Tg(q) + Bu
    // http://underactuated.mit.edu/underactuated.html?chapter=acrobot
    const dx = new eig.Matrix([q1, q2])
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
      this.x.set(2, -10 * wrapAngle(this.x.get(0) - theta))
      this.x.set(3, -10 * wrapAngle(this.x.get(1)))
      dx.set(0, this.x.get(2))
      dx.set(1, this.x.get(3))
      dx.set(2, 0)
      dx.set(3, 0)
    }
    // console.log('x', x, 'xDot', xDot)
    const newX = this.x.matAdd(dx.mul(dt))
    newX.set(0, wrapAngle(newX.get(0)))
    newX.set(1, wrapAngle(newX.get(1)))
    eig.GC.set(this, 'x', newX)
  }
}

export { Acrobot }