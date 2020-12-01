import _ from 'lodash'
import eig from '@eigen'

class RRT {
  constructor(system) {
    this.system = system;
    this.params = system.rrtParams();
    this.watchers = new Set();
    // Initialize graph
    this.clear();
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

  sample() {
    const n = this.system.shape[0] / 2;
    const x = eig.Matrix.random(n, 1);
    const xMin = this.params.xMin;
    const xMax = this.params.xMax;
    for (let k = 0; k < n; k++)
      x.set(k, xMin[k] + (x.get(k) + 1) / 2 * (xMax[k] - xMin[k]));
    return x;
  }

  step(x1, x2) {
    let dx = x2.matSub(x1);
    const x22 = new eig.Matrix(x2);
    for (let k = 0; k < dx.length(); k++) {
      if (!this.params.wrap[k]) continue;
      const rng = this.params.xMax[k] - this.params.xMin[k];
      const adx = Math.abs(dx.get(k));
      if (adx > rng / 2)
        x22.set(k, x22.get(k) - Math.sign(dx.get(k)) * rng);
    }
    dx = x22.matSub(x1);
    const dxn = dx.norm();
    const xNext = eig.Matrix(x1);
    for (let k = 0; k < dx.length(); k++) {
      const eps = Math.min(this.params.deltas[k], dxn);
      xNext.set(k, xNext.get(k) + dx.get(k) / dxn * eps);
    }
    this.system.bound(xNext);


    // Handle wrapping
    // const dx = x2.matSub(x1);
    // const x2n = x2.matAdd(dx);
    // this.system.bound(x2n);
    // x2n.matSubSelf(x1);
    // const x1next = new eig.Matrix(x1);
    // for (let k = 0; k < dx.length(); k++) {
    //   const sign = Math.abs(x2n.get(k)) < Math.abs(dx.get(k)) ? 1 : -1;
    //   const eps = this.params.deltas[k];
    //   x1next.set(k, x1next.get(k) + sign * eps);
    // }
    return xNext;
  }

  dist(x1, x2) {
    // Norm in wrapped space
    const dx = x2.matSub(x1);
    for (let k = 0; k < dx.length(); k++) {
      if (!this.params.wrap[k]) continue;
      const rng = this.params.xMax[k] - this.params.xMin[k];
      const adx = Math.abs(dx.get(k));
      if (adx > rng / 2)
        dx.set(k, rng - adx);
    }
    return dx.norm();
  }

  findClosestNode(x) {
    let minDist = Infinity;
    let minNode = null;
    this.nodes.forEach(node => {
      const dist = this.dist(x, node.x);
      if (dist < minDist) {
        minNode = node;
        minDist = dist;
      }
    });
    return minNode;
  }

  append(x, node = null) {
    // Optional node
    const newNode = {
      next: []
    };
    eig.GC.set(newNode, 'x', x);
    if (node)
      node.next.push(newNode);
    this.nodes.push(newNode);
  }

  clear() {
    eig.GC.popException(this.nodes);
    this.nodes = [];
    this.append(this.system.x.block(0, 0, this.params.n, 1))
  }

  extend(x) {
    const node = this.findClosestNode(x);
    if (node) {
      // Take a step in x direction
      const xNext = this.step(node.x, x);
      this.append(xNext, node);
    } else {
      // Only append x for now
      this.append(x);
    }
  }

  run(validFun, iterations) {
    // Clear graph
    this.clear();
    for (let k = 0; k < iterations; k++) {
      const x = this.sample();
      if (!validFun(x))
        continue;
      this.extend(x)
    }
    console.log('nodes', this.nodes)
    this.watchers.forEach(fun => fun());
  }
}

export default RRT