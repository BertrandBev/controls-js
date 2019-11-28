/* eslint-disable */
// import eig from '../../lib/eigen-js/eigen.js'
const eig = require('@lib/eigen-js/eigen.js')
import _ from 'lodash'
import { LQR } from './controls.js'
import { wrapAngle, sqr } from './math.js'

class Quadrotor2D {
  constructor(params = {}) {
    this.params = {
      g: 9.81,
      l: 1,
      m: 1,
      I: 1,
      // mu: 0.5, TODO: add natural damping
      ...params
    }
    const x = params.x0 || new eig.DenseMatrix(...this.shape());
    eig.GC.set(this, 'x', x)
  }

  /**
   * Get the shape of a system
   * @returns {Array} shape [xn, un]
   */
  shape() {
    return [6, 2]
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    x.vSet(2, wrapAngle(x.vGet(2)))
  }

  /**
   * Returns dx/dt
   * @param {DenseMatrix} x
   * @param {DenseMatrix} u
   * @returns {DenseMatrix} dx
   */
  dynamics(x, u) {
    // x = [x, y, theta, dx, dy, dtheta]
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const ddx = eig.DenseMatrix.fromArray([
      -(u.vGet(0) + u.vGet(1)) * s / p.m,
      (u.vGet(0) + u.vGet(1)) * c / p.m - p.g,
      p.l / 2 * (u.vGet(0) - u.vGet(1)) / p.I
    ])
    const dx = x.block(3, 0, 3, 1)
    return dx.vcat(ddx)
  }


  /**
   * Get steady state command
   */
  ssCommand() {
    const cmd = this.params.g * this.params.m / 2
    return eig.DenseMatrix.fromArray([
      cmd, cmd
    ])
  }


  /**
   * Execute a step
   * @param {DenseMatrix} u controls effort
   * @param {Number} dt delta time
   * @param {Array} mouseTarget optional mouse target
   */
  step(u, dt, mouseTarget) {
    let dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (mouseTarget) {
      const dxo = eig.DenseMatrix.fromArray([
        mouseTarget[0] - this.x.vGet(0),
        mouseTarget[1] - this.x.vGet(1),
        -this.x.vGet(2)
      ]).mul(10).clamp(-10, 10)
      dx = dxo.vcat(new eig.DenseMatrix(3, 1))
      for (let k = 0; k < dxo.rows(); k++) {
        this.x.vSet(k + 3, dxo.vGet(k))
      }
    }
    // console.log('x', x, 'xDot', xDot)
    const newX = this.x.matAdd(dx.mul(dt))
    newX.vSet(2, wrapAngle(newX.vGet(2)))
    eig.GC.set(this, 'x', newX)
  }

  /**
   * TODO: add to shared lib
   * @param {Array} traj 
   * @param {Number} dt 
   * @param {Number} tau Decay characteristic time for low-pass
   */
  differenciate(traj, dt, tau = 1e-8, loop = false) {
    const dTraj = []
    for (let k = 0; k < traj.length; k++) {
      const div = traj[(k + 1) % traj.length].matSub(traj[k % traj.length]).div(dt)
      dTraj.push(div)
    }
    return this.smooth(dTraj, dt, tau)
  }

  /**
   * 
   * @param {Array} trah 
   * @param {Number} tau Decay characteristic time for low-pass
   */
  smooth(traj, dt, tau = 1e-8) {
    if (traj.length === 0) {
      return []
    }
    const decay = Math.exp(-2 * Math.PI * dt / tau)
    let val = traj[0]
    const smoothed = []
    for (let k = 0; k < 2 * traj.length; k++) {
      val = val.mul(decay).matAdd(traj[k % traj.length].mul(1 - decay))
      if (k >= traj.length) {
        smoothed.push(val)
      }
    }
    return smoothed
  }

  /**
   * Differential flatness solution for an x, y trajectory
   * @returns [x; u]
   */
  fitTrajectory(xy, dt) {
    const p = this.params
    // Differenciate trajectory
    xy = this.smooth(xy, dt, 1)
    const dxy = this.differenciate(xy, dt, 1, true)
    const ddxy = this.differenciate(dxy, dt, 1, true)
    const theta = ddxy.map(val => {
      const t = Math.atan(-val.vGet(0) / (val.vGet(1) + p.g))
      return eig.DenseMatrix.fromArray([t])
    })
    const dtheta = this.differenciate(theta, dt, 1, true)
    const ddtheta = this.differenciate(dtheta, dt, 1, true)
    return xy.map((val, idx) => {
      // compute u
      const a = p.m * Math.sqrt(sqr(ddxy[idx].vGet(0)) + sqr(ddxy[idx].vGet(1) + p.g)) / 2
      const b = p.I * ddtheta[idx].vGet(0) / p.l
      const u = eig.DenseMatrix.fromArray([a + b, a - b])
      return val.vcat(theta[idx]).vcat(dxy[idx]).vcat(dtheta[idx]).vcat(u)
    })
  }
}

export { LQR, Quadrotor2D }