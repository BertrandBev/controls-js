import _ from 'lodash';
import eig from "@eigen";
import Trajectory from '@/components/planners/trajectory.js';
import { Grid } from './utils.js';
import { smooth } from '@/components/math.js';

class ValueIterationPlanner2D {
  /**
   * Create a ValueIterationPlanner
   * @param {Object} system System of interest
   */
  constructor(system) {
    this.system = system;
    this.watchers = new Set();
    // Value iteration result
    this.V = [[]];
    this.bounds = {};
  }

  /**
   * Add update callback
   */
  addWatcher(fun) {
    this.watchers.add(fun);
  }

  /**
   * Add update callback
   */
  removeWatcher(fun) {
    this.watchers.delete(fun);
  }

  getMatrix() {
    return this.V;
  }

  setParams(params) {
    this.params = params;
    this.xMin = this.params.x.min[0];
    this.xMax = this.params.x.max[0];
    this.yMin = this.params.x.min[1];
    this.yMax = this.params.x.max[1];
    this.xn = this.params.x.nPts[0];
    this.yn = this.params.x.nPts[1];
    this.un = this.params.u.nPts[0];
    this.dt = this.params.dt;
    // Init V & transition tables
    this.tableI = [];
    this.tableJ = [];
    this.V = [...Array(this.xn)].map(() => [...Array(this.yn)].map(() => null));
    this.policy = [...Array(this.xn)].map(() => [...Array(this.yn)].map(() => 0));
    for (let k = 0; k < this.un; k++) {
      this.tableI.push([...Array(this.xn)].map(() => [...Array(this.yn)].map(() => null)));
      this.tableJ.push([...Array(this.xn)].map(() => [...Array(this.yn)].map(() => null)));
    }
    this.points = [];
    for (let i = 0; i < this.xn; i++)
      for (let j = 0; j < this.yn; j++)
        this.points.push({ i, j });
    const uMin = this.params.u.min[0];
    const uMax = this.params.u.max[0];
    this.U = [...Array(this.un).keys()].map(idx => {
      return new eig.Matrix([uMin + idx * (uMax - uMin)]);
    });
    // Populate targets
    if (!this.params.x.targets) throw new Error("The system must define valid targets");
    this.params.x.targets.forEach(target => {
      const pt = this.pack(new eig.Matrix(target));
      this.V[pt.i][pt.j] = 0;
    });
  }

  unpackU(uk) {
    const u = this.params.u.min[0] + uk / this.un *
      (this.params.u.max[0] - this.params.u.min[0]);
    return new eig.Matrix([u]);
  }

  pack(x) {
    let i = (x.get(0) - this.xMin) / (this.xMax - this.xMin);
    i = Math.max(0, Math.min(this.xn - 1, Math.floor(i * this.xn)));
    let j = (x.get(1) - this.yMin) / (this.yMax - this.yMin);
    j = Math.max(0, Math.min(this.yn - 1, Math.floor(j * this.yn)));
    return { i, j };
  }

  unpackPt(pt) {
    return this.unpack(pt.i, pt.j);
  }

  unpack(i, j) {
    return new eig.Matrix([
      this.xMin + ((i + 0.5) / this.xn) * (this.xMax - this.xMin),
      this.yMin + ((j + 0.5) / this.yn) * (this.yMax - this.yMin)
    ]);
  }

  smoothTable(table) {
    // this.un = 1;
    // this.xn = 3;
    // this.yn = 3;
    // this.points = [];
    // for (let i = 0; i < this.xn; i++)
    //   for (let j = 0; j < this.yn; j++)
    //     this.points.push({ i, j });
    // table = {0: [
    //   [null, null, 6],
    //   [null, null, null],
    //   [3, null, null],
    // ]};
    const meanTable = table.map(t => t.map(t => t.map(t => t ?? 0)));
    for (let sk = 0; sk < 100; sk++) {
      let maxUpdate = 0;
      for (let uk = 0; uk < this.un; uk++) {
        for (let pk = 0; pk < this.points.length; pk++) {
          const pt = this.points[pk];
          if (table[uk][pt.i][pt.j] != null) continue;
          let avg = 0;
          let count = 0;
          if (pt.i > 0) { count += 1; avg += meanTable[uk][pt.i - 1][pt.j]; }
          if (pt.i < this.xn - 1) { count += 1; avg += meanTable[uk][pt.i + 1][pt.j]; }
          if (pt.j > 0) { count += 1; avg += meanTable[uk][pt.i][pt.j - 1]; }
          if (pt.j < this.yn - 1) { count += 1; avg += meanTable[uk][pt.i][pt.j + 1]; }
          avg /= Math.max(count, 1);
          maxUpdate = Math.max(maxUpdate, Math.abs(meanTable[uk][pt.i][pt.j] - avg));
          meanTable[uk][pt.i][pt.j] = avg;
        }
        // console.log('maxUpdate', maxUpdate);
        // console.log('meanTable', meanTable);
      }
      if (maxUpdate < 1e-1) break;
    }
    // Now clamp table
    for (let uk = 0; uk < this.un; uk++) {
      this.points.forEach(pt => {
        const newVal = meanTable[uk][pt.i][pt.j];
        if (table[uk][pt.i][pt.j] == null)
          table[uk][pt.i][pt.j] = Math.floor(newVal);
      });
    }
  }

  /**
   * Create transition table
   */
  createTransitionTable() {
    const a = Date.now();
    let stationnary = 0;
    for (let uk = 0; uk < this.un; uk++) {
      const u = this.U[uk];
      this.points.forEach(pt => {
        const x = this.unpack(pt.i, pt.j);
        const xNext = this.system.xNext(x, u, this.dt, false);
        const nextPt = this.pack(xNext);
        const newPt = nextPt.i != pt.i || nextPt.j != pt.j;
        // console.log('i,j', [pt.i, pt.j], 'x,y', [x.get(0), x.get(1)], 'u', u.get(0), '=>', 'x,y', [xNext.get(0), xNext.get(1)], 'newPt', newPt);
        if (newPt) {
          this.tableI[uk][pt.i][pt.j] = nextPt.i; //  nextPt;
          this.tableJ[uk][pt.i][pt.j] = nextPt.j; //  nextPt;
        }
        else {
          stationnary += 1;
        }
      });
    }
    const ratio = 100 * stationnary / (this.points.length * this.un);
    console.log(`Stationnary ratio: ${ratio.toFixed(2)}%`);
    if (ratio > 80) return false;
    // Transition created. Now smooth table
    this.smoothTable(this.tableI);
    this.smoothTable(this.tableJ);
    console.log('tableI:', this.tableI);
    console.log('tableJ:', this.tableJ);
  }

  /**
   * Running cost associated with triplet x, u, dt
   */
  cost() {
    return this.dt;
  }

  valueIterationInit() {
    this.policy = {};
    this.V.tensor.clear(Infinity);
    this.kxTargets.forEach(k => {
      this.V.tensor.data[k] = 0;
    });
  }

  /**
   * Run a step of value iteration
   */
  runValueIteration(maxIter = 1000) {
    for (let k = 0; k < maxIter; k++) {
      let maxUpdate = 0;
      // console.log('V before', JSON.parse(JSON.stringify(this.V)));
      this.points.forEach(pt => {
        const currentV = this.V[pt.i][pt.j];
        let minV = currentV;
        for (let uk = 0; uk < this.un; uk++) {
          const ni = this.tableI[uk][pt.i][pt.j];
          const nj = this.tableJ[uk][pt.i][pt.j];
          if ((ni != pt.i || nj != pt.j) && this.V[ni][nj] != null) {
            const nextV = this.cost() + this.V[ni][nj];
            if (minV == null || nextV < minV) {
              // console.log([pt.i, pt.j], 'next', [ni, nj], 'nextV', nextV);
              minV = nextV;
              this.policy[pt.i][pt.j] = uk;
            }
          }
        }
        const delta = Math.abs((this.V[pt.i][pt.j] ?? 0) - (minV ?? 0));
        maxUpdate = Math.max(maxUpdate, delta);
        this.V[pt.i][pt.j] = minV;
      });
      // console.log('V after', JSON.parse(JSON.stringify(this.V)));
      if (maxUpdate < 1e-3) {
        console.log(`Successfully converged in ${k} iterations`);
        console.log('bestU', this.policy);
        return true;
      }
    }
    console.log(`Could not converge after ${maxIter} iterations`);
    return false;
  }

  run(params, maxIter = 1000) {
    // Init params
    this.setParams(params);
    // Create transition table
    this.createTransitionTable();
    // Run VI
    this.runValueIteration(maxIter);
    // Update watchers
    this.watchers.forEach(fun => fun());
  }

  getControl(x) {
    x = this.V.clamp(x);
    const kx = this.V.pack(x);
    return this.U.unpack(this.policy[kx]);
  }

  /**
   * Simulate
   * @param {Trajectory} trajectory - the trajectory to be set
   * @param {Number} duration
   */
  simulate(x0, trajectory, maxDuration) {
    const sequence = [];
    // Find closest value in table
    let dist = Infinity;
    let pt;
    this.points.forEach(pt0 => {
      const x = this.unpackPt(pt0);
      const d = x0.matSub(x).normSqr();
      if (d < dist) {
        dist = d;
        pt = pt0;
      }
    });
    if (pt == null) return;
    // Now start for x
    for (let t = 0; t <= maxDuration; t += this.dt) {
      const ku = this.policy[pt.i][pt.j];
      const ni = this.tableI[ku][pt.i][pt.j];
      const nj = this.tableJ[ku][pt.i][pt.j];
      const x = this.unpack(ni, nj);
      const u = this.unpackU(ku);
      sequence.push(x.vcat(u));
      // Check for target
      const v = this.V[ni][nj];
      if (v == 0) break;
      pt = { i: ni, j: nj };
    }
    trajectory.set(sequence, this.dt);
  }
}

export default ValueIterationPlanner2D;