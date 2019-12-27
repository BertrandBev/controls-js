import _ from 'lodash'
import eig from '@eigen'

class Tensor {
  /**
   * Create a tensor
   * @param {Array} dims 
   */
  constructor(dims) {
    this.dims = dims
    this.length = _.reduce(dims, (p, n) => p * n, 1)
    this.data = [...Array(this.length)].fill(0)
  }

  /**
   * [indices] -> k
   * @param {Array} indices 
   */
  pack(indices) {
    let k = 0
    this.dims.forEach((dim, idx) => {
      k = k * dim + indices[idx]
    })
    return k
  }

  /**
   * k -> [indices]
   * @param {Number} k 
   */
  unpack(k) {
    let prod = this.length
    return this.dims.map(dim => {
      prod /= dim
      const newK = k % prod
      const idx = (k - newK) / prod
      k = newK
      return idx
    })
  }

  /**
   * Get Value at vector
   * @param {Array} indices
   */
  get(indices) {
    return this.data[this.pack(indices)]
  }

  /**
   * Set Value at vector
   * @param {Array} indices
   * @param {Number} val
   */
  set(indices, val) {
    this.data[this.pack(indices)] = val
  }

  /**
   * Iterator
   */
  forEach(fun) {
    for (let k = 0; k < this.length; k++) {
      const ind = this.unpack(k)
      fun(k, ind)
    }
  }

  /**
   * Print tensor
   * @param {String} title 
   */
  print() {
    console.log(this.data)
  }

  /**
   * Get matrix form
   */
  getMatrix() {
    console.assert(this.dims.length === 2, `The tensor dimension (${this.dims}) must be 2`)
    return [...Array(this.dims[0])].map((val, i) => {
      return [...Array(this.dims[1])].map((val, j) => this.get([i, j]))
    })
  }
}

/**
 * Test // TODO: use a test framework
 */
function testTensor() {
  const t = new Tensor([2, 3, 4]);
  [...Array(2)].map((_, i) => i).forEach(i => {
    [...Array(3)].map((_, i) => i).forEach(j => {
      [...Array(4)].map((_, i) => i).forEach(k => {
        const indices = [i, j, k];
        const val = i + j + k
        const flat = t.pack(indices)
        const expanded = t.unpack(flat);
        t.set(indices, val)
        console.assert(_.isEqual(expanded, indices), 'Index packing, expected %s, got %s', indices, expanded)
        console.assert(t.get(indices) === val, 'Value error, expected %d, got %d', val, t.get(indices))
      })
    })
  })
  console.log('Test successful')
}

class Grid {
  /**
   * 
   * @param {Array} grid [{min, max, nPts}, ...] spec for each dimension
   */
  constructor(grid) {
    this.grid = grid
    this.tensor = new Tensor(grid.map(val => val.nPts))
  }

  /**
   * Clamp vector to bounds
   * @param {Matrix} vec 
   */
  clamp(vec) {
    const clamped = new eig.Matrix(vec)
    this.grid.forEach((val, idx) => {
      const v = Math.max(val.min, Math.min(val.max, clamped.vGet(idx)))
      clamped.vSet(idx, v)
    })
    return clamped
  }

  /**
   * Snap vector value to tensor index
   * @param {Matrix} vec
   */
  pack(vec) {
    const ind = this.toGrid(vec)
    return ind ? this.tensor.pack(ind) : null;
  }

  /**
   * Unpack tensor idx
   * @param {Number} idx 
   */
  unpack(idx) {
    const ind = this.tensor.unpack(idx)
    return this.fromGrid(ind)
  }

  /**
   * Snap vector value to grid indices
   * @param {Matrix} vec
   */
  toGrid(vec) {
    let oob = false
    const ind = this.grid.map((val, idx) => {
      const scalar = (vec.vGet(idx) - val.min) / (val.max - val.min)
      const k = Math.floor(scalar * val.nPts)
      oob |= k < 0 || k >= val.nPts
      return Math.max(0, Math.min(val.nPts - 1, k))
    })
    return oob ? null : ind
  }

  /**
   * Get cell mean position
   * @param {Array} indices
   */
  fromGrid(indices) {
    const vec = this.grid.map((val, idx) => {
      const interval = (val.max - val.min) / val.nPts
      const factor = Math.max(0, Math.min(val.nPts, indices[idx]))
      return val.min + interval * (factor + .5)
    })
    return eig.Matrix.fromArray(vec)
  }

  /**
   * Get tensor value at
   * @param {Matrix} vec 
   */
  get(vec) {
    const ind = this.toGrid(vec)
    return this.tensor.get(ind)
  }

  /**
   * Set tensor value at
   */
  set(vec, val) {
    const ind = this.toGrid(vec)
    return this.tensor.set(ind, val)
  }

  /**
   * Iterator
   * @param {Function} fun - (k: Number, vec: Matrix)
   */
  forEach(fun) {
    this.tensor.forEach((k, ind) => {
      const vec = this.fromGrid(ind)
      fun(k, vec)
    })
  }
}

export { Tensor, Grid }