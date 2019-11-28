import _ from 'lodash'
const eig = require("../../lib/eigen-js/eigen.js");
import { wrapAngle } from './controls.js'
import Plotly from 'plotly.js-dist'
import { Interpolator } from './utils.js'

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



class ValueIterationPlanner {
  /**
   * Create a ValueIterationPlanner
   * @param {Object} system System of interest
   * @param {Array} xGrid [{min, max, count}, ...] spec for each dimension
   * @param {Array} uGrid [{min, max, count}, ...] spec for each dimension
   */
  constructor(system, xGrid, uGrid, xEqs, dt) {
    this.system = system;
    [this.xGrid, this.uGrid] = [xGrid, uGrid]
    this.V = new Tensor(xGrid.map(val => val.count))
    this.U = new Tensor(uGrid.map(val => val.count))
    this.xEqInds = xEqs.map(x => this.toGrid(this.xGrid, x))
    this.dt = dt
    this.createTransitionTable()
    this.interp = new Interpolator()
  }

  /**
   * Create transition table
   */
  createTransitionTable() {
    this.table = {}
    let stationnaryCount = 0
    let updateCount = 0
    for (let k = 0; k < this.V.length; k++) {
      const xInd = this.V.unpack(k)
      const x = this.fromGrid(this.xGrid, xInd) // TODO: create iterator helper
      const isEq = _.some(this.xEqInds.map(ind => _.isEqual(ind, xInd)))
      if (isEq) {
        // Terminal state, no updated needed
        continue
      }
      this.table[k] = {}
      for (let l = 0; l < this.U.length; l++) {
        const uInd = this.U.unpack(l)
        const u = this.fromGrid(this.uGrid, uInd) // TODO: create iterator helper
        const dx = this.system.dynamics(x, u)
        const newX = x.matAdd(dx.mul(this.dt)) // TODO: add RK4 schema
        newX.vSet(0, wrapAngle(newX.vGet(0))) // TODO: extract away in system utility function
        const newInd = this.toGrid(this.xGrid, newX);
        updateCount += 1
        if (_.isEqual(newInd, xInd)) {
          stationnaryCount += 1
          continue
        }
        this.table[k][l] = this.V.pack(newInd)
      }
      eig.GC.flush()
    }
    console.log(`stationnary ${stationnaryCount / updateCount * 100}%`)
  }

  /**
   * Snap vector value to grid indices
   * @param {Array} grid [xGrid, uGrid]
   * @param {Matrix} vec
   */
  toGrid(grid, vec) {
    return grid.map((val, idx) => {
      const scalar = (vec.vGet(idx) - val.min) / (val.max - val.min)
      return Math.max(0, Math.min(val.count - 1, Math.floor(scalar * val.count)))
    })
  }

  /**
   * Get cell mean position
   * @param {Array} grid [xGrid, uGrid]
   * @param {Array} indices
   */
  fromGrid(grid, indices) {
    const vec = grid.map((val, idx) => {
      const interval = (val.max - val.min) / val.count
      const factor = Math.max(0, Math.min(val.count, indices[idx]))
      return val.min + interval * (factor + .5)
    })
    return eig.DenseMatrix.fromArray(vec)
  }

  /**
   * Running cost associated with triplet x, u, dt
   */
  cost() {
    return this.dt
  }


  /**
   * Run a step of value iteration
   */
  step(iter = 0) {
    let maxUpdate = 0
    _.forEach(this.table, (val, xIdx) => {
      let minV = Infinity
      _.forEach(val, (newIdx, uIdx) => {
        minV = Math.min(minV, this.cost() + this.V.data[newIdx])
      })
      maxUpdate = Math.max(maxUpdate, Math.abs(this.V.data[xIdx] - minV) || 0)
      this.V.data[xIdx] = minV
    })
    if (iter % 100 === 0) {
      console.log('max update', maxUpdate)
    }
    return maxUpdate < 10e-8;
  }

  run(nIter) {
    for (let k = 0; k < nIter; k++) {
      const converged = this.step(k)
      if (converged) {
        console.log(`Converged in ${k + 1} iterations`)
        this.buildPolicy()
        // this.V.print()
        return
      }
    }
    console.log(`Not converged after ${nIter} iterations`)
  }


  buildPolicy() {
    this.policy = []
    for (let k = 0; k < this.V.length; k++) {
      let bestU = 0 // TODO: pick random U
      let minCost = Infinity
      _.forEach(this.table[k] || {}, (newIdx, uIdx) => {
        const cost = this.V.data[newIdx]
        if (cost < minCost) {
          minCost = cost;
          bestU = uIdx
        }
      })
      this.policy.push(bestU)
    }
  }

  /**
   * Rollout
   * @param {Number} tStart
   * @param {Number} tEnd
   */
  rollout(tStart, tEnd) {
    this.tStart = tStart
    const sequence = []
    let x = this.system.x
    let xInd = this.V.pack(this.toGrid(this.xGrid, x))
    sequence.push(new eig.DenseMatrix(x))
    for (let t = tStart; t <= tEnd; t += this.dt) {
      const u = this.policy[xInd]
      xInd = (this.table[xInd] || {})[u];
      if (!xInd) {
        // Fixed point found, return
        break;
      }
      // this.fromGrid(this.xGrid, this.V.unpack(xInd)).print('')
      sequence.push(this.fromGrid(this.xGrid, this.V.unpack(xInd)))
    }
    this.interp.set(sequence, this.dt)
  }

  /**
   * Sample rollout a time t
   * @param {Number} t
   */
  sampleRollout(t) {
    // Rescale t
    t = Math.min(t - this.tStart, this.interp.tEnd)
    return this.interp.get(t)
  }

  /**
   * Plot result
   */
  plot(div) {
    const data = [{
      z: this.V.getMatrix(),
      x0: this.xGrid[0].min,
      dx: (this.xGrid[0].max - this.xGrid[0].min) / this.xGrid[0].count,
      y0: this.xGrid[1].min,
      dy: (this.xGrid[1].max - this.xGrid[1].min) / this.xGrid[1].count,
      type: 'heatmap'
    }];
    const layout = {
      xaxis: { title: 'theta (rad)' },
      yaxis: { title: 'thetaDot (rad)' }
    }
    const config = {
      displaylogo: false,
      displayModeBar: false,
      scrollZoom: false,
      showAxisDragHandles: false
    }
    Plotly.newPlot(div, data, layout, config);
  }
}

function test() {
  // const VI = new ValueIterationPlanner({}, [
  //   { min: -0.2, max: 0.2, count: 3 },
  //   { min: -3, max: 3, count: 7 }
  // ])
  // VI.step()
}

export { ValueIterationPlanner, test }