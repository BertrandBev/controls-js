import _ from 'lodash'
import eig from "@eigen";
import Trajectory from '@/components/planners/trajectory.js'
import { Grid } from './utils.js'
import { smooth } from '@/components/math.js'

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
    const MAX_ITER = 20; // max lookahead iterations
    const a = Date.now()
    this.table = {}
    this.tableDt = {}
    let maxIterReached = 0
    let updateCount = 0
    this.V.forEach((kx, x) => {
      if (!this.isTarget(x)) {
        this.table[kx] = {}
        this.tableDt[kx] = {}
        this.U.forEach((ku, u) => {
          updateCount += 1
          let i = 0;
          let xIter = x;
          for (i = 0; i < MAX_ITER; i++) {
            xIter = this.system.xNext(xIter, u, this.dt, false);
            const kxn = this.V.pack(xIter);
            if (kxn == kx)
              continue;
            else if (kxn) {
              this.table[kx][ku] = kxn
              this.tableDt[kx][ku] = (i + 1) * this.dt;
            }
            break;
          }
          if (i == MAX_ITER)
            maxIterReached += 1;
        })
      }
    })
    eig.GC.flush()
    console.log('Table creation time:', Date.now() - a, 'ms')
    // console.log('table', this.table)
    console.log(`max iter reached ${maxIterReached}; ${maxIterReached / updateCount * 100}%`)
  }

  /**
   * Running cost associated with triplet x, u, dt
   */
  cost() {
    return this.dt
  }

  valueIterationInit() {
    this.policy = {}
    this.V.tensor.clear(Infinity);
    this.kxTargets.forEach(k => {
      this.V.tensor.data[k] = 0;
    });
  }

  /**
   * Run a step of value iteration
   */
  valueIterationStep(iter) {
    let maxUpdate = 0
    _.forEach(this.table, (val, kx) => {
      let bestU = null; // TODO: pick random U
      let minV = this.V.tensor.data[kx]
      _.forEach(val, (kxn, ku) => {
        const nextV = this.cost() + this.V.tensor.data[kxn]
        if (nextV < minV) {
          minV = nextV;
          bestU = ku;
        }
      })
      maxUpdate = Math.max(maxUpdate, Math.abs(this.V.tensor.data[kx] - minV) || 0)
      if (bestU) {
        this.V.tensor.data[kx] = minV
        this.policy[kx] = bestU;
      }
    })
    if (iter > 0 && iter % 100 === 0) {
      console.log('max update', maxUpdate)
    }
    return maxUpdate < 10e-8;
  }

  run(params, maxIter = 1000) {
    this.V = new Grid(params.x)
    this.U = new Grid(params.u)
    this.kxTargets = params.x.targets.map(x => this.V.pack(new eig.Matrix(x)))
    this.dt = params.dt
    this.createTransitionTable();
    this.valueIterationInit();
    for (let k = 0; k < maxIter; k++) {
      const converged = this.valueIterationStep(k)
      if (converged) {
        console.log(`Converged in ${k + 1} iterations`)
        this.watchers.forEach(fun => fun())
        return true;
      }
    }
    console.log(`Not converged after ${maxIter} iterations`)
    return false;
  }

  getControl(x) {
    x = this.V.clamp(x)
    const kx = this.V.pack(x)
    return this.U.unpack(this.policy[kx])
  }

  /**
   * Simulate
   * @param {Trajectory} trajectory - the trajectory to be set
   * @param {Number} duration
   */
  simulate(x0, trajectory, maxDuration) {
    const sequence = []
    // Find closest value in table
    let dist = Infinity;
    let kx;
    _.forEach(this.table, (val, _kx) => {
      const x = this.V.unpack(_kx);
      const d = x0.matSub(x).normSqr();
      if (d < dist) {
        dist = d;
        kx = _kx;
      }
    })
    if (!kx) return;
    // Now start for x
    for (let t = 0; t <= maxDuration; t += this.dt) {
      const ku = this.policy[kx];
      const x = this.V.unpack(kx);
      const u = this.U.unpack(ku);
      sequence.push(x.vcat(u));
      // Check for target
      if (_.some(this.kxTargets.map(k => _.isEqual(k, kx))))
        break;
      kx = this.table[kx][ku];
      if (!kx || !ku) break;
    }
    trajectory.set(sequence, this.dt);
  }
}

export default ValueIterationPlanner