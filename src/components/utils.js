import _ from 'lodash'
const eig = require("../../lib/eigen-js/eigen.js");

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
   * Create interpolator based on an array of matrices
   * @param {Array} array of matrices
   * @param {Number} dt 
   */
  set(array, tStart, dt) {
    console.assert(dt > 0, 'The time must be positive')
    console.assert(array.length > 0, 'The array must have at least one element')
    eig.GC.set(this, 'array', array)
    this.dt = dt
    this.tStart = tStart
    this.tEnd = tStart + (this.array.length - 1) * this.dt
    this.delta = this.tEnd - this.tStart
  }


  /**
   * Get interpolated value
   * @param {Number} t time of interpolation
   */
  get(t) {
    // console.assert(t >= 0 && t <= this.tEnd, 'Time out of bound')
    t -= this.tStart;
    let idx = Math.max(0, Math.floor(t / this.dt))
    idx = this.loop ? idx % (this.array.length - 1) : Math.min(this.array.length - 2, idx)
    const ratio = Math.max(0, Math.min(1, t % this.delta - this.dt * idx) / this.dt);
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
    const dt = this.delta / nPts;
    for (let t = this.tStart; t < this.tEnd; t += dt) {
      tList.push(t - this.tStart)
      xList.push(this.get(t).vGet(idx))
    }
    return [tList, xList]
  }
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