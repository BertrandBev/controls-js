import _ from 'lodash'
import eig from "@eigen";
import Trajectory from '@/components/planners/trajectory.js'
import { Grid } from './utils.js'

class ValueIterationParams {
  /**
   * @param {Array} xGrid [{min, max, count}, ...] spec for each dimension
   * @param {Array} uGrid [{min, max, count}, ...] spec for each dimension
   */
  constructor(xGrid, uGrid, xTargets, dt) {
    this.xGrid = xGrid
    this.uGrid = uGrid
    this.xTargets = xTargets
    this.dt = dt
  }
}

class ValueIterationPlanner {
  /**
   * Create a ValueIterationPlanner
   * @param {Object} system System of interest
   */
  constructor(system) {
    this.system = system;
    this.watchers = new Set()
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

  getMatrix() {
    return this.V.tensor.getMatrix();
  }

  isTarget(x) {
    const kx = this.V.pack(x)
    return _.some(this.kxTargets.map(k => _.isEqual(k, kx)))
  }

  /**
   * Create transition table
   */
  createTransitionTable() {
    const a = Date.now()
    this.table = {}
    let stationnaryCount = 0
    let updateCount = 0
    this.V.forEach((kx, x) => {
      if (!this.isTarget(x)) {
        this.table[kx] = {}
        this.U.forEach((ku, u) => {
          const xNext = this.system.xNext(x, u, this.dt)
          const kxn = this.V.pack(xNext)
          updateCount += 1
          if (kxn === kx) {
            stationnaryCount += 1
          } else if (kxn) {
            this.table[kx][ku] = kxn
          }
        })
      }
    })
    eig.GC.flush()
    console.log('Table creation time:', Date.now() - a, 'ms')
    // console.log('table', this.table)
    console.log(`stationnary ${stationnaryCount / updateCount * 100}%`)
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
  valueIterationStep(iter) {
    let maxUpdate = 0
    this.policy = []
    _.forEach(this.table, (val, kx) => {
      let bestU = 0 // TODO: pick random U
      let minV = Infinity
      _.forEach(val, (kxn, ku) => {
        const nextV = this.cost() + this.V.tensor.data[kxn]
        if (nextV < minV) {
          minV = nextV;
          bestU = ku;
        }
      })
      maxUpdate = Math.max(maxUpdate, Math.abs(this.V.tensor.data[kx] - minV) || 0)
      this.V.tensor.data[kx] = minV
      this.policy.push(bestU)
    })
    if (iter % 100 === 0) {
      console.log('max update', maxUpdate)
    }
    return maxUpdate < 10e-8;
  }

  run(params, maxIter = 1000) {
    this.V = new Grid(params.xGrid)
    this.U = new Grid(params.uGrid)
    this.kxTargets = params.xTargets.map(x => this.V.pack(eig.Matrix.fromArray(x)))
    this.dt = params.dt
    this.createTransitionTable()
    for (let k = 0; k < maxIter; k++) {
      const converged = this.valueIterationStep(k)
      if (converged) {
        console.log(`Converged in ${k + 1} iterations`, this.watchers)
        this.watchers.forEach(fun => fun())
        return
      }
    }
    console.log(`Not converged after ${maxIter} iterations`)
  }

  getControl(x) {
    x = this.V.clamp(x)
    const kx = this.V.pack(x)
    return this.U.unpack(this.policy[kx])
  }

  /**
   * Simulate
   * @param {Number} duration
   */
  simulate(duration) {
    const sequence = []
    let x = new eig.Matrix(this.system.x)
    sequence.push(x)
    for (let t = 0; t <= duration; t += this.dt) {
      const u = this.getControl(x)
      x = this.system.xNext(x, u, this.dt)
      sequence.push(x)
      if (this.isTarget(x)) {
        // Fixed point found, return
        break;
      }
    }
    const traj = new Trajectory(true)
    traj.set(sequence, Date.now() / 1000, this.dt)
    return traj
  }
}

export { ValueIterationParams }
export default ValueIterationPlanner