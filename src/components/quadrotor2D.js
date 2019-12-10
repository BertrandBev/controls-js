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
    const [u1, u2] = [u.vGet(0), u.vGet(1)]
    const ddx = eig.DenseMatrix.fromArray([
      -(u1 + u2) * s / p.m,
      (u1 + u2) * c / p.m - p.g,
      p.l / 2 * (u1 - u2) / p.I
    ])
    const dx = x.block(3, 0, 3, 1)
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
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const [u1, u2] = [u.vGet(0), u.vGet(1)]
    const dx2dt = -(u1 + u2) * c / p.m
    const dy2dt = -(u1 + u2) * s / p.m
    return eig.DenseMatrix.fromArray([
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
      [0, 0, dx2dt, 0, 0, 0],
      [0, 0, dy2dt, 0, 0, 0],
      [0, 0, 0, 0, 0, 0]
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
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const dx2du1 = -s / p.m
    const dy2du1 = c / p.m
    const dt2du1 = p.l / 2 / p.I
    return eig.DenseMatrix.fromArray([
      [0, 0], [0, 0], [0, 0], [dx2du1, dx2du1], [dy2du1, dy2du1], [dt2du1, -dt2du1]
    ])
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

const flipTraj =
  [[-2.0000, -1.5000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 30.0000],
  [-1.9995, -1.4464, -0.0399, 0.0291, 1.4715, -1.0935, 0.0000, 30.0000],
  [-1.9915, -1.2857, -0.1594, 0.2320, 2.9326, -2.1870, 0.0000, 30.0000],
  [-1.9573, -1.0202, -0.3587, 0.7773, 4.3316, -3.2805, 0.0000, 30.0000],
  [-1.8664, -0.6587, -0.6377, 1.8063, 5.5383, -4.3740, 0.0000, 30.0000],
  [-1.6805, -0.2229, -0.9965, 3.3825, 6.3223, -5.4675, 0.0000, 30.0000],
  [-1.3868, 0.2359, -1.4216, 4.3690, 6.0666, -6.0143, 0.0000, 0.0000],
  [-1.0648, 0.6518, -1.8618, 4.5108, 5.3309, -6.0863, 0.0000, 3.9518],
  [-0.7064, 0.9986, -2.3223, 5.5409, 3.9463, -6.7051, 0.0000, 30.0000],
  [-0.2546, 1.1970, -2.8507, 6.6950, 1.3965, -7.7863, 0.4181, 29.7424],
  [0.2412, 1.1939, -3.4310, 6.6970, -1.4810, -7.7740, 30.0000, 0.0000],
  [0.6939, 0.9901, -3.9583, 5.5690, -4.0022, -6.6968, 29.1014, 0.0000],
  [1.0587, 0.6419, -4.4207, 4.6969, -5.3097, -6.1665, 0.0000, 0.0000],
  [1.3945, 0.2283, -4.8669, 4.4272, -6.0231, -6.0309, 7.4379, 0.0000],
  [1.6826, -0.2249, -5.2882, 3.2915, -6.2465, -5.4081, 26.7367, 0.0000],
  [1.8664, -0.6587, -5.6454, 1.8063, -5.5383, -4.3740, 30.0000, 0.0000],
  [1.9573, -1.0202, -5.9245, 0.7773, -4.3316, -3.2805, 30.0000, 0.0000],
  [1.9915, -1.2857, -6.1238, 0.2320, -2.9326, -2.1870, 30.0000, 0.0000],
  [1.9995, -1.4464, -6.2433, 0.0291, -1.4715, -1.0935, 30.0000, 0.0000],
  [2.0000, -1.5000, -6.2832, 0.0000, 0.0000, 0.0000, 30.0000, 0.0000]];

export { Quadrotor2D, flipTraj }