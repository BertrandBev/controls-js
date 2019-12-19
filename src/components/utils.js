import _ from 'lodash'
import eig from "@eigen";

class Interpolator {
  /**
   * Constructor
   * @param {Bool} loop whether the time wraps around
   */
  constructor(loop = false) {
    this.loop = loop
  }

  /**
   * Check if the interoplator is ready
   */
  ready() {
    return !!this.array
  }

  /**
   * Reset starting time
   */
  reset() {
    this.tStart = Date.now() / 1000
  }

  /**
   * Create interpolator based on an array of matrices
   * @param {Array} array of matrices
   * @param {Number} dt 
   */
  set(array, dt) {
    console.assert(dt > 0, 'The time must be positive')
    console.assert(array.length > 0, 'The array must have at least one element')
    eig.GC.set(this, 'array', array)
    this.dt = dt
    this.tStart = Date.now() / 1000
    this.duration = (this.array.length - 1) * this.dt
  }


  /**
   * Get interpolated value
   * @param {Number} t time of interpolation
   */
  get(t) {
    t -= this.tStart;
    let idx = Math.max(0, Math.floor(t / this.dt))
    idx = this.loop ? idx % (this.array.length - 1) : Math.min(this.array.length - 2, idx)
    const ratio = Math.max(0, Math.min(1, t % this.duration - this.dt * idx) / this.dt);
    return this.array.length < 2 ?
      this.array[0] :
      this.array[idx].mul(1 - ratio).matAdd(this.array[idx + 1].mul(ratio))
  }

  /**
   * Delete interpolator
   */
  delete() {
    eig.GC.popException(this.array)
    this.array = null
  }

  /**
   * Get series
   */
  getList(idx, nPts) {
    const xList = []
    const tList = []
    for (let t = this.tStart; t < this.tStart + this.duration; t += this.dt) {
      tList.push(t - this.tStart)
      xList.push(this.get(t).vGet(idx))
    }
    return [tList, xList]
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
   * From array
   */
}

/**
 * Test // TODO: use a test framework TODO: refactor
 */
function testInterpolator() {
  const array = [1, 2, 3, 7]
  const ip = new Interpolator(array, 0.5)
  let val = [ip.get(0), ip.get(1), ip.get(1.5), ip.get(0.25)];
  let expected = [1, 3, 7, 1.5];
  console.assert(_.isEqual(val, expected), `Expected ${expected}, got ${val}`);
  console.log('Test successful')
}

export { Interpolator }