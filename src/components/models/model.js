import eig from '@eigen'

class Model {
  constructor(states, commands, params) {
    // Populate properties
    this.states = states
    this.commands = commands
    this.shape = [this.states.length, this.commands.length]
    this.statesCommands = [...states, ...commands]
    // Set state
    const x0 = new eig.Matrix(params.x0) || new eig.Matrix(this.shape[0], 1);
    this.setState(x0)
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
    // Override if needed  
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
}

export default Model