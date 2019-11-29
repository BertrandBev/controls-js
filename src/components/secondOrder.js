/* eslint-disable */
// import eig from '../../lib/eigen-js/eigen.js'
const eig = require('@lib/eigen-js/eigen.js')
import _ from 'lodash'

class SecondOrder {
  constructor(params = {}) {
    this.params = {
      m: 1,
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
    return [2, 1]
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
  }

  /**
   * Returns dx/dt
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} dx
   */
  dynamics(x, u) {
    return eig.DenseMatrix.fromArray([
      x.vGet(1),
      u.vGet(0) / this.params.m
    ])
  }

  /**
   * Returns df/dx
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} df/dx
   */
  xJacobian(x, u) {
    return eig.DenseMatrix.fromArray([
      [0, 1], [0, 0]
    ])
  }

  /**
   * Returns df/du
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} df/du
   */
  uJacobian(x, u) {
    return eig.DenseMatrix.fromArray([
      [0], [1 / this.params.m]
    ])
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
      // Control cart
      const xVel = 10 * (mouseTarget[0] - this.x.vGet(0));
      this.x.vSet(1, _.clamp(xVel, -15, 15))
      dx.vSet(0, this.x.vGet(1))
    }
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    eig.GC.set(this, 'x', newX)
  }
}

export { SecondOrder }