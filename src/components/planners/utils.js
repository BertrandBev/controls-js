import _ from 'lodash'

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
   * Print tensor
   * @param {String} title 
   */
  print(title) {
    console.log(title, this.data)
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

export { Tensor }