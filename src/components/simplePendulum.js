const eig = require('@eigen')
import _ from 'lodash'
import { wrapAngle, sqr } from './math.js'

class SimplePendulum {
  constructor(params = {}) {
    this.params = {
      g: 9.81,
      l: 1,
      m: 1,
      mu: 0.5,
      ...params
    }
    const x = params.x0 || new eig.Matrix(2, 1);
    eig.GC.set(this, 'x', x)
  }

  /**
   * Get the shape of a system
   * @returns {Array} shape [xn, un]
   */
  shape() {
    return [2, 1]
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    x.vSet(0, wrapAngle(x.vGet(0)))
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [theta, thetaDot]
    const p = this.params
    const dx = new eig.Matrix(2, 1);
    const s = Math.sin(x.vGet(0))
    const ddx = (-p.m * p.g * p.l * s - p.mu * x.vGet(1) + u.vGet(0)) / (p.m * Math.pow(p.l, 2))
    dx.vSet(0, x.vGet(1))
    dx.vSet(1, ddx)
    return dx
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params
    const c = Math.cos(x.vGet(0))
    return eig.Matrix.fromArray([
      [0, 1],
      [-p.g / p.l * c, - p.mu / p.m * p.l]
    ])
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    const p = this.params
    return eig.Matrix.fromArray([
      [0], [1 / p.m / sqr(p.l)]
    ])
  }

  /**
   * Execute a step
   * @param {Matrix} u controls effort
   * @param {Number} dt delta time
   * @param {Array} mouseTarget optional mouse target
   */
  step(u, dt, mouseTarget) {
    const dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (mouseTarget) {
      const theta = Math.atan2(mouseTarget[1], mouseTarget[0]) + Math.PI / 2
      this.x.vSet(1, 10 * wrapAngle(theta - this.x.vGet(0)))
      dx.vSet(0, this.x.vGet(1))
      dx.vSet(1, 0)
    }
    // console.log('x', x, 'xDot', xDot)
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    eig.GC.set(this, 'x', newX)
  }
}

export { SimplePendulum }