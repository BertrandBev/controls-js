/* eslint-disable */
// import eig from '../../lib/eigen-js/eigen.js'
const eig = require('@lib/eigen-js/eigen.js')
import _ from 'lodash'
import { wrapAngle, sqr } from './math.js'

class CartPole {
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'theta', angle: true, min: -Math.PI, max: Math.PI, show: true },
    { name: 'xDot' },
    { name: 'thetaDot' }
  ])

  static COMMANDS = Object.freeze([
    { name: 'force' }
  ])

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
    return [CartPole.STATES.length, CartPole.COMMANDS.length]
  }

  /**
   * Get states description
   */
  states() {
    return CartPole.STATES
  }

  /**
   * Get commands description
   */
  commands() {
    return CartPole.COMMANDS
  }

  /**
   * Get steady-state command
   */
  ssCommand() {
    return eig.DenseMatrix.fromArray([0])
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
    const ddx = eig.DenseMatrix.fromArray([
      (u.vGet(0) + p.mp * s * (p.l * sqr(x.vGet(3)) + p.g * c)) / den, //- p.mu * x.vGet(2),
      -(u.vGet(0) * c + p.mp * p.l * sqr(x.vGet(3)) * c * s + (p.mp + p.mc) * p.g * s) / p.l / den //- p.mu * x.vGet(3)
    ])
    return dx.vcat(ddx)
  }

  /**
   * Returns df/dx
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params
    const td = x.vGet(3)
    const f = u.vGet(0)
    const [c, s] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const [c2, s2, td2] = [sqr(c), sqr(s), sqr(td)]
    const den = p.mp * s2 + p.mc
    const dx2dt = (p.mp * c * (p.l * td2 + p.g * c) - p.g * p.mp * s2) / den - (2 * p.mp * c * s * (f + p.mp * s * (p.l * td2 + p.g * c))) / sqr(den)
    const dx2dt1 = (2 * p.l * p.mp * td * s) / den
    const dt2dt = (f * s - p.g * c * (p.mc + p.mp) - p.l * p.mp * td2 * c2 + p.l * p.mp * td2 * s2) / (p.l * den) + (2 * p.mp * c * s * (p.l * p.mp * c * s * td2 + f * c + p.g * s * (p.mc + p.mp))) / (p.l * sqr(den))
    const dt2dt1 = -(2 * p.mp * td * c * s) / den
    return eig.DenseMatrix.fromArray([
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, dx2dt, 0, dx2dt1],
      [0, dt2dt, 0, dt2dt1]
    ])
  }

  /**
   * Returns df/du
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} df/du
   */
  uJacobian(x, u) {
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const s2 = sqr(s)
    const dx2du = 1 / (p.mp * s2 + p.mc)
    const dt2du = -c / (p.l * (p.mp * s2 + p.mc))
    return eig.DenseMatrix.fromArray([
      [0], [0], [dx2du], [dt2du]
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
      if (this.controls === "pendulum") {
        // Control pendulum
        const theta = Math.atan2(mouseTarget[1], mouseTarget[0] - this.x.vGet(0)) + Math.PI / 2
        this.x.vSet(3, 10 * wrapAngle(theta - this.x.vGet(1)))
        dx.vSet(1, this.x.vGet(3))
        dx.vSet(3, 0)
      } else {
        // Control cart
        const xVel = 10 * (mouseTarget[0] - this.x.vGet(0));
        this.x.vSet(2, _.clamp(xVel, -15, 15))
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