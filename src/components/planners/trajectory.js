import _ from 'lodash'
import eig from "@eigen";

class Trajectory {
  /**
   * Constructor
   * @param {Bool} loop whether the time wraps around
   */
  constructor(loop = false) {
    this.array = []
    this.loop = loop
    this.watchers = []
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
  reset() {
    this.tStart = 0 // Date.now() / 1000
  }

  /**
   * Add update callback
   */
  onChange(fun) {
    this.watchers.push(fun)
  }

  /**
   * Create trajectory based on an array of matrices
   * @param {Array} array of matrices
   * @param {Number} dt 
   */
  set(array, dt) {
    eig.GC.popException(this.array)
    console.assert(dt > 0, 'The time must be positive')
    console.assert(array.length > 0, 'The array must have at least one element')
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
   * Delete trajectory
   */
  delete() {
    eig.GC.popException(this.array)
    this.array = null
  }

  /**
   * Get a string version of the trajectory
   */
  print() {
    let rows = `dt: ${this.dt},\n` + 'x: ['
    this.array.forEach((vec, idx) => {
      rows += '['
      for (let k = 0; k < vec.length(); k += 1) {
        rows += `${vec.vGet(k).toFixed(4)}` + (k < vec.length() - 1 ? ',' : '')
      }
      rows += ']' + (idx === this.array.length - 1 ? ']' : ',\n')
    })
    console.log(rows)
  }

  /**
   * Legend
   */
  setLegend(legend) {
    this.legend = legend
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