import eig from '@eigen'
import _ from 'lodash'
import chroma from 'chroma-js'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'
import { wrapAngle, sqr } from '@/components/math.js'

class Quadrotor2D extends Model {
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'y', show: true },
    { name: 'theta', show: true },
    { name: 'yDot', derivative: true },
    { name: 'xDot', derivative: true },
    { name: 'thetaDot', derivative: true },
  ])

  static COMMANDS = Object.freeze([
    { name: 't1' },
    { name: 't2' }
  ])

  constructor(params = {}) {
    super(Quadrotor2D.STATES, Quadrotor2D.COMMANDS, params)
    this.params = {
      g: 9.81,
      l: 1,
      m: 1,
      I: 1,
      // mu: 0.5, TODO: add natural damping
      ...params
    }
    this.graphics = {}
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
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [x, y, theta, dx, dy, dtheta]
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const [u1, u2] = [u.vGet(0), u.vGet(1)]
    const ddx = eig.Matrix.fromArray([
      -(u1 + u2) * s / p.m,
      (u1 + u2) * c / p.m - p.g,
      p.l / 2 * (u1 - u2) / p.I
    ])
    const dx = x.block(3, 0, 3, 1)
    return dx.vcat(ddx)
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const [u1, u2] = [u.vGet(0), u.vGet(1)]
    const dx2dt = -(u1 + u2) * c / p.m
    const dy2dt = -(u1 + u2) * s / p.m
    return eig.Matrix.fromArray([
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
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(2)), Math.sin(x.vGet(2))]
    const dx2du1 = -s / p.m
    const dy2du1 = c / p.m
    const dt2du1 = p.l / 2 / p.I
    return eig.Matrix.fromArray([
      [0, 0], [0, 0], [0, 0], [dx2du1, dx2du1], [dy2du1, dy2du1], [dt2du1, -dt2du1]
    ])
  }

  /**
   * Get steady state command
   */
  ssCommand() {
    const cmd = this.params.g * this.params.m / 2
    return eig.Matrix.fromArray([
      cmd, cmd
    ])
  }


  /**
   * Execute a step
   * @param {Matrix} u controls effort
   * @param {Number} dt delta time
   * @param {Array} mouseTarget optional mouse target
   */
  step(u, dt, mouseTarget) {
    let dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (mouseTarget) {
      const dxo = eig.Matrix.fromArray([
        mouseTarget[0] - this.x.vGet(0),
        mouseTarget[1] - this.x.vGet(1),
        -this.x.vGet(2)
      ]).mul(10).clamp(-10, 10)
      dx = dxo.vcat(new eig.Matrix(3, 1))
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
      return eig.Matrix.fromArray([t])
    })
    const dtheta = this.differenciate(theta, dt, 1, true)
    const ddtheta = this.differenciate(dtheta, dt, 1, true)
    return xy.map((val, idx) => {
      // compute u
      const a = p.m * Math.sqrt(sqr(ddxy[idx].vGet(0)) + sqr(ddxy[idx].vGet(1) + p.g)) / 2
      const b = p.I * ddtheta[idx].vGet(0) / p.l
      const u = eig.Matrix.fromArray([a + b, a - b])
      return val.vcat(theta[idx]).vcat(dxy[idx]).vcat(dtheta[idx]).vcat(u)
    })
  }
}

const flipTraj = {
  dt: 0.1162028035978925,
  x: [[-2.0000, -1.5000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 10.0000],
  [-1.9995, -1.4986, -0.0374, 0.0152, 0.0231, -0.6116, 0.0000, 10.0000],
  [-1.9918, -1.4848, -0.1447, 0.1452, 0.2797, -1.1032, 3.9228, 10.0000],
  [-1.9509, -1.4075, -0.2946, 0.5990, 1.0888, -1.2825, 10.0000, 9.7854],
  [-1.8364, -1.2313, -0.4384, 1.2433, 1.5911, -0.9702, 10.0000, 0.0000],
  [-1.6503, -1.0434, -0.5197, 1.8137, 1.4728, -0.3586, 10.0000, 0.0000],
  [-1.3908, -0.8721, -0.5261, 2.4312, 1.3287, 0.2530, 10.0000, 0.0000],
  [-1.0569, -0.7176, -0.4578, 3.0155, 1.2031, 0.8646, 10.0000, 0.0000],
  [-0.6578, -0.5755, -0.3146, 3.4829, 1.1323, 1.4762, 10.0000, 0.0000],
  [-0.2187, -0.4623, -0.1091, 3.6336, 0.5245, 1.7820, 0.0000, 0.0000],
  [0.2258, -0.4700, 0.1081, 3.6323, -0.6374, 1.7629, 0.0000, 0.6247],
  [0.6643, -0.5939, 0.3097, 3.4768, -1.2072, 1.4380, 0.0000, 10.0000],
  [1.0631, -0.7450, 0.4482, 3.0176, -1.2744, 0.8264, 0.0000, 10.0000],
  [1.3979, -0.9078, 0.5119, 2.4461, -1.3932, 0.2148, 0.0000, 10.0000],
  [1.6603, -1.0865, 0.5007, 1.8463, -1.5271, -0.3968, 0.0000, 10.0000],
  [1.8474, -1.2717, 0.4196, 1.1948, -1.4220, -0.8904, 3.8566, 10.0000],
  [1.9528, -1.4166, 0.2910, 0.5478, -0.8844, -1.1859, 6.4810, 10.0000],
  [1.9918, -1.4850, 0.1448, 0.1448, -0.2753, -1.1054, 10.0000, 3.8502],
  [1.9995, -1.4986, 0.0374, 0.0152, -0.0231, -0.6116, 10.0000, 0.0000],
  [2.0000, -1.5000, 0.0000, 0.0000, 0.0000, 0.0000, 10.0000, 0.0000]]
}


export { Quadrotor2D, flipTraj }