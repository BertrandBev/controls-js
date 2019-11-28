/* eslint-disable */
// import eig from '../../lib/eigen-js/eigen.js'
const eig = require('@lib/eigen-js/eigen.js')
import _ from 'lodash'
import { LQR, wrapAngle, sqr, clamp } from './controls.js'

class CartPole {
  constructor(params = {}) {
    this.params = {
      g: 9.81,
      l: 1,
      mp: 0.2,
      mc: 1,
      mu: 0.5,
      ...params
    }
    const x = params.x0 || new eig.DenseMatrix(4, 1);
    eig.GC.set(this, 'x', x)
  }

  /**
   * Get the shape of a system
   * @returns {Array} shape [xn, un]
   */
  shape() {
    return [4, 1]
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    x.vSet(1, wrapAngle(x.vGet(1)))
  }

  /**
   * Returns dx/dt
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} dx
   */
  dynamics(x, u) {
    // x = [x, theta, dx, dtheta]
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const dx = x.block(2, 0, 2, 1)
    const den = p.mc + p.mp * sqr(s)
    const ddx = new eig.DenseMatrix.fromArray([
      u.vGet(0) + p.mp * s * (p.l * sqr(x.vGet(3)) + p.g * c) / den - p.mu * x.vGet(1),
      -(u.vGet(0) * c + p.mp * p.l * sqr(x.vGet(3)) * c * s + (p.mp + p.mc) * p.g * s) / p.l / den - p.mu * x.vGet(3)
    ])
    return dx.vcat(ddx)
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
      if (this.controls = "pendulum") {
        // Control pendulum
        const theta = Math.atan2(mouseTarget[1], mouseTarget[0] - this.x.vGet(0)) + Math.PI / 2
        this.x.vSet(3, 10 * wrapAngle(theta - this.x.vGet(1)))
        dx.vSet(1, this.x.vGet(3))
        dx.vSet(3, 0)
      } else {
        // Control cart
        const xVel = 10 * (mouseTarget[0] - this.x.vGet(0));
        this.x.vSet(2, clamp(xVel, -15, 15))
        dx.vSet(0, this.x.vGet(2))
        dx.vSet(2, 0)
      }
    }
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    eig.GC.set(this, 'x', newX)
  }
}

export { CartPole }