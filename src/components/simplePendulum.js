/* eslint-disable */
// import eig from '../../lib/eigen-js/eigen.js'
const eig = require('../../lib/eigen-js/eigen.js')
import _ from 'lodash'
import { LQR, wrapAngle } from './controls.js'

class SimplePendulum {
  constructor(params = {}) {
    this.params = {
      g: 9.81,
      l: 1,
      m: 1,
      mu: 0.5,
      ...params
    }
    const x = params.x0 || new eig.DenseMatrix(2, 1);
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
   * @param {Array} mouseTarget optional mouse target
   */
  step(u, dt, mouseTarget) {
    const dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (mouseTarget) {
      const theta = -Math.atan2(mouseTarget[0], mouseTarget[0]) - Math.PI / 2
      this.x.vSet(1, -10 * wrapAngle(this.x.vGet(0) - theta))
      dx.vSet(0, this.x.vGet(1))
      dx.vSet(1, 0)
    }
    // console.log('x', x, 'xDot', xDot)
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    eig.GC.set(this, 'x', newX)
  }
}

export { LQR, SimplePendulum }