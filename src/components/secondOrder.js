const eig = require('@eigen')
import _ from 'lodash'

class SecondOrder {
  constructor(params = {}) {
    this.params = {
      m: 1,
      ...params
    }
    const x = params.x0 || new eig.Matrix(4, 1);
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
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    return eig.Matrix.fromArray([
      x.vGet(1),
      u.vGet(0) / this.params.m
    ])
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    return eig.Matrix.fromArray([
      [0, 1], [0, 0]
    ])
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    return eig.Matrix.fromArray([
      [0], [1 / this.params.m]
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

const traj = {
  dt: 0.12393841378998359,
  x: [[-2.0000, 0.0000, 1.7359],
  [-1.9787, 0.3870, 4.3016],
  [-1.8919, 0.9814, 4.9707],
  [-1.7251, 1.6206, 5.0000],
  [-1.4762, 2.2617, 5.0000],
  [-1.1453, 2.8997, 4.9521],
  [-0.7372, 3.4329, 3.3654],
  [-0.2752, 3.7273, 1.2268],
  [0.2066, 3.7416, -1.0035],
  [0.6724, 3.4786, -3.0985],
  [1.0881, 2.9693, -4.8460],
  [1.4286, 2.3381, -5.0000],
  [1.6872, 1.6973, -4.9971],
  [1.8639, 1.0595, -4.9522],
  [1.9636, 0.5313, -3.2872],
  [2.0000, 0.0000, -5.0000],
  [1.9589, -0.6411, -5.0000],
  [1.8356, -1.2821, -5.0000],
  [1.6301, -1.9232, -5.0000],
  [1.3425, -2.5642, -5.0000],
  [0.9726, -3.2053, -5.0000],
  [0.5205, -3.8464, -5.0000],
  [-0.0000, -4.1669, 0.0000],
  [-0.5205, -3.8464, 5.0000],
  [-0.9726, -3.2053, 5.0000],
  [-1.3425, -2.5642, 5.0000],
  [-1.6301, -1.9232, 5.0000],
  [-1.8356, -1.2821, 5.0000],
  [-1.9589, -0.6411, 5.0000],
  [-2.0000, 0.0000, 5.0000]]
}

export { SecondOrder, traj }