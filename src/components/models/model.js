import eig from '@eigen'

class Model {
  static STATE_BOUNDS = 1000

  constructor(states, commands, params) {
    // Populate properties
    this.states = states
    this.commands = commands
    this.shape = [this.states.length, this.commands.length]
    this.statesCommands = [...states, ...commands]
    // Set state
    const x0 = params.x0 ? new eig.Matrix(params.x0) : this.trim().x;
    this.setState(x0)
  }

  trim() {
    return { x: new eig.Matrix(this.shape[0], 1), u: new eig.Matrix(this.shape[1], 1) }
  }

  /**
   * Set state
   * @param {Matrix} x
   */
  setState(x) {
    eig.GC.set(this, 'x', x)
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    x.clampSelf(-Model.STATE_BOUNDS, Model.STATE_BOUNDS)
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    throw new Error('Must be overridden')
  }

  /**
   * Get next state from some state
   * @param {Matrix} x - State
   * @param {Matrix} u - Command
   * @param {Number} dt - Timestep
   */
  xNext(x, u, dt) {
    const dx = this.dynamics(x, u)
    const xNext = x.matAdd(dx.mul(dt))
    this.bound(xNext)
    return xNext
  }

  /**
   * Reverse trajectory array
   * @param {Array} array
   */
  reverse(array) {
    const backward = array.map(val => eig.Matrix(val));
    backward.reverse();
    const [xn, un] = this.shape
    // Shift backwards commands and tranform directions
    for (let k = 0; k < backward.length; k++) {
      if (k > 0) {
        const block = backward[k].block(xn, 0, un, 1);
        backward[k - 1].setBlock(xn, 0, block);
      }
      this.statesCommands.forEach((val, idx) => {
        if (val.derivative) backward[k].vSet(idx, -backward[k].vGet(idx))
      })
    }
    const forward = [...array]
    forward.splice(array.length - 1, 1)
    return [...forward, ...backward]
  }

  /**
   * Simulate
   */
  simulate(controller, x0, dt, duration) {
    let x = new eig.Matrix(x0)
    const arr = []
    for (let t = 0; t < duration; t += dt) {
      const u = controller.getCommand(x, t);
      const dx = this.dynamics(x, u);
      arr.push(x.vcat(u))
      x.matAddSelf(dx.mul(dt))
    }
    return arr
  }
}

export default Model