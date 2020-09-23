import _ from 'lodash'
import eig from '@eigen'

class RRT {
  constructor(system) {
    this.system = system;
    this.params = system.rrtParams();
    // Initialize graph
    this.nodes = [];
  }

  sample() {
    const n = this.system.shape[0] / 2;
    const x = eig.Matrix.random(n, 1);
    const xMin = this.params.xMin;
    const xMax = this.params.xMax;
    for (let k = 0; k < n; k++)
      x.vSet(k, xMin[k] + x.vGet(k) * (xMax[k] - xMin[k]));
    return x;
  }

  step(x1, x2) {
    // Handle wrapping
    const dx = x2.matSub(x1);
    const x2n = x2.matAdd(dx);
    this.system.bound(x2n);
    x2n.matSubSelf(x1);
    const x1next = eig.Matrix(x1);
    for (let k = 0; k < dx.length(); k++) {
      const sign = Math.abs(x2n.vGet(k)) < Math.abs(dx.vGet(k)) ? 1 : -1;
      const eps = this.params.deltas[k];
      x1next.vSet(k, x1next.vGet(k) + sign * eps);
    }
    return x1next;
  }

  findClosestNode(x) {
    let minDist = Infinity;
    let minNode = null;
    this.nodes.forEach(node => {
      const dist = node.x.matSub(x).norm();
      if (dist < minDist) {
        minNode = node;
        minDist = dist;
      }
    });
    return minNode;
  }

  append(x, node) {
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
  }

  run(validFun, iterations) {
    // Clear graph
    this.clear();
    for (let k = 0; k < iterations; k++) {
      const x = this.sample();
      if (!validFun(x))
        continue;
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
  }
}

export default RRT