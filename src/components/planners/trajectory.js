import _ from 'lodash'
import eig from "@eigen";

class Trajectory {
  /**
   * Constructor
   * @param {Bool} loop whether the time wraps around
   */
  constructor(system, loop = true) {
    this.array = []
    this.loop = loop
    this.watchers = new Set()
    this.system = system
  }

  getLegend() {
    return this.system.statesCommands
  }

  /**
   * Check if the interoplator is ready
   */
  ready() {
    return this.array.length > 0
  }

  /**
   * Return trajectory dimension
   */
  dim() {
    return !this.ready() ? 0 : this.array[0].rows()
  }

  /**
   * Reset starting time
   */
  reset(t) {
    this.tStart = t; // Date.now() / 1000
  }

  /**
   * Clear traj
   */
  clear() {
    this.array = []
  }

  /**
   * Add update callback
   */
  addWatcher(fun) {
    this.watchers.add(fun)
  }

  /**
   * Add update callback
   */
  removeWatcher(fun) {
    this.watchers.delete(fun)
  }

  /**
   * Create a trajectory based on an array of matrices
   * @param {Array} array of matrices
   * @param {Number} dt 
   */
  set(array, dt) {
    eig.GC.popException(this.array)
    console.assert(dt > 0, 'The time must be positive')
    console.assert(array.length > 0, 'The array must have at least one element')
    // Control array content
    const rows = this.system.shape[0] + this.system.shape[1];
    array.forEach(val => {
      console.assert(val.rows() === rows && val.cols() === 1,
        `The values must be of shape [x; u]; expected ${[rows, 1]}, got ${[val.rows(), val.cols()]}`);
    })
    eig.GC.set(this, 'array', array)
    this.dt = dt
    this.tStart = 0 //Date.now() / 1000
    this.duration = (this.array.length - 1) * this.dt
    this.watchers.forEach(fun => fun())
  }

  /**
   * Get interpolated value
   * @param {Number} t time of interpolation
   */
  get(t) {
    t -= this.tStart;
    t -= Math.floor(t / this.duration) * this.duration
    let idx = Math.max(0, Math.floor(t / this.dt))
    idx = this.loop ? idx % this.array.length : Math.min(this.array.length - 1, idx)
    const nextIdx = (idx + 1) % this.array.length;
    let ratio = (t - idx * this.dt) / this.dt;
    ratio = Math.max(0, Math.min(1, ratio));
    return this.array.length < 2 ?
      this.array[0] :
      this.array[idx].mul(1 - ratio).matAdd(this.array[nextIdx].mul(ratio))
  }

  /**
   * Get interpolated state
   * @param {Number} t 
   */
  getState(t) {
    return this.get(t).block(0, 0, this.system.shape[0], 1)
  }

  /**
   * Get interpolated command
   * @param {Number} t 
   */
  getCommand(t) {
    return this.get(t).block(this.system.shape[0], 0, this.system.shape[1], 1)
  }

  /**
   * Delete trajectory
   */
  delete() {
    eig.GC.popException(this.array)
    this.array = null
  }

  /**
   * Load trajectory from a dump
   * @param {Object} dump 
   */
  load(dump) {
    this.set(dump.x.map(eig.Matrix.fromArray), dump.dt);
  }

  /**
   * Get a string version of the trajectory
   */
  dump() {
    let rows = `dt: ${this.dt},\n` + 'x: ['
    this.array.forEach((vec, idx) => {
      rows += '['
      for (let k = 0; k < vec.length(); k += 1) {
        rows += `${vec.vGet(k).toFixed(4)}` + (k < vec.length() - 1 ? ',' : '')
      }
      rows += ']' + (idx === this.array.length - 1 ? ']' : ',\n')
    })
    return rows;
  }
}

/**
 * Test // TODO: use a test framework TODO: refactor
 */
function testTrajectory() {
  const array = [1, 2, 3, 7]
  const ip = new Trajectory(array, 0.5)
  let val = [ip.get(0), ip.get(1), ip.get(1.5), ip.get(0.25)];
  let expected = [1, 3, 7, 1.5];
  console.assert(_.isEqual(val, expected), `Expected ${expected}, got ${val}`);
  console.log('Test successful')
}

export default Trajectory