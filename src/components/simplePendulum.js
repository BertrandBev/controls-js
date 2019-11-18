function wrapAngle(angle) {
  let mod = (angle + Math.PI) % (2 * Math.PI)
  if (mod < 0) { mod += 2 * Math.PI }
  return mod - Math.PI
}

class SimplePendulum {
  constructor(params = {}) {
    this.params = {
      g: 9.81,
      l: 1,
      m: 1,
      mu: 0,
      ...params
    }
    this.x = params.x0 || [0, 0]
    this.target = null
  }

  /**
   * Returns dx/dt
   * @param {Array} x
   * @param {Array} u
   */
  dynamics(x, u) {
    // x = [theta, thetaDot]
    const p = this.params
    return [
      x[1],
      (-p.m * p.g * p.l * Math.sin(x[0]) - p.mu * x[1] + u) / (p.m * Math.pow(p.l, 2))
    ]
  }

  step(u, dt) {
    let xDot = this.dynamics(this.x, u)
    // Override x if target tracking
    if (this.target) {
      const theta = -wrapAngle(Math.atan2(this.target.y, this.target.x) - Math.PI / 2)
      this.x[1] = -10*wrapAngle(this.x[0] - theta)
      xDot = [this.x[1], 0]
    }
    // console.log('x', this.x, 'xDot', xDot)
    this.x[0] = wrapAngle(this.x[0] + xDot[0] * dt)
    this.x[1] += xDot[1] * dt
  }
}

export default SimplePendulum