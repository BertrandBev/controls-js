import nlopt from '@lib/nlopt-js/nlopt.js'
import eig from '@lib/eigen-js/eigen.js'

class DirectCollocation {
  constructor(system, n, xStart, xEnd, uMax) {
    console.assert(n >= 2, "The number of points must be positive")
    this.system = system
    this.n = n
    eig.GC.set(this, 'xStart', xStart)
    eig.GC.set(this, 'xEnd', xEnd)

    // Compute dimensionality
    this.shape = system.shape()
    this.dim = (this.shape[0] + this.shape[1]) * this.n + 1
    this.opt = new nlopt.Optimize(this.dim)

    // Set objective
    this.opt.set_min_objective(nlopt.ScalarFunction.fromLambda((x, grad) => {
      const tEnd = x[this.dim - 1]
      if (grad) {
        for (let k = 0; k < this.dim - 1; k++) {
          grad[k] = 0
        }
        grad[this.dim - 1] = 1
      }
      return tEnd
    }), 1e-4)

    // Add dynamic constraint
    this.addDynamicContraints()

    // Set bounds
    this.setBounds(uMax)
  }

  setBounds(uMax) {
    const lower = new nlopt.Vector()
    const upper = new nlopt.Vector()
    const x0 = new nlopt.Vector()
    const uIdx = this.n * this.shape[0]
    const tIdx = this.dim - 1
    const INF = 1e500;
    function setPoint(low, hight, x) {
      lower.push_back(low)
      upper.push_back(hight)
      x0.push_back(x)
    }
    for (let k = 0; k < this.dim; k++) {
      if (k < this.shape[0]) {
        // xStart
        const val = this.xStart.vGet(k)
        setPoint(val, val, val)
      } else if (k < uIdx - this.shape[0]) {
        // x
        setPoint(-INF, INF, 0)
      } else if (k < uIdx) {
        // xEnd
        const val = this.xEnd.vGet(k - uIdx + this.shape[0])
        setPoint(val, val, val)
      } else if (k < tIdx) {
        // u
        setPoint(-uMax, uMax, 0)
      } else {
        // tEnd
        setPoint(0, INF, 1)
      }
    }
    this.opt.set_lower_bounds(lower)
    this.opt.set_upper_bounds(upper)
    this.x0 = x0
    // DEBUG
    this.printVals(lower, 'lower')
    this.printVals(upper, 'upper')
  }

  getVector(arr, idx, len) {
    const vec = new eig.DenseMatrix(len, 1)
    for (let k = 0; k < len; k++) {
      vec.vSet(k, arr[idx + k])
    }
    return vec
  }

  addDynamicContraints() {
    const nConst = (this.n - 1) * this.shape[0]
    const tolVec = nlopt.Vector.fromArray([...Array(nConst)].map(() => 1e-4))
    let iter = 0;
    this.opt.add_equality_mconstraint(nlopt.VectorFunction.fromLambda((x, grad, res) => {
      // const d = new Date()
      // Retreive initial values
      const h = x[this.dim - 1] / (this.n - 1)
      let xk = this.xStart;
      let uk = this.getVector(x, this.shape[0] * this.n, this.shape[1])
      let fk = this.system.dynamics(xk, uk);

      // console.log('## ITER')
      // const xc = []
      // x.forEach(val => xc.push(val))
      // console.log('x', xc)

      // Loop for all colocation points
      let max = 0
      for (let k = 0; k < this.n - 1; k++) {
        const xknIdx = this.shape[0] * (k + 1)
        const uknIdx = this.shape[0] * this.n + this.shape[1] * (k + 1)
        const xkn = this.getVector(x, xknIdx, this.shape[0])
        const ukn = this.getVector(x, uknIdx, this.shape[1]);
        const fkn = this.system.dynamics(xkn, ukn);
        // Compute collocation point
        const xck = xk.matAdd(xkn).div(2).matAdd(fk.matSub(fkn).mul(h / 8));
        const uck = uk.matAdd(ukn).div(2);
        const fck = this.system.dynamics(xck, uck);
        // Add constraint
        const c = xk.matSub(xkn).matAdd(fk.matAdd(fck.mul(4)).matAdd(fkn).mul(h / 6))
        for (let i = 0; i < this.shape[0]; i++) {
          // res[k * this.shape[0] + i] = Math.pow(c.vGet(i), 2) - 1e-2
          res[k * this.shape[0] + i] = c.vGet(i)
          max = Math.max(max, Math.pow(c.vGet(i), 2))
        }

        // Compute derivatives


        // TEMP
        // console.log(`${k} -------`)
        // xk.print(`xk ${k}`)
        // xkn.print(`xkn ${k} (idx ${xknIdx})`)
        // xck.print(`xck ${k}`)
        // uk.print(`uk ${k}`)
        // ukn.print(`ukn ${k} (idx ${uknIdx})`)
        // uck.print(`uck ${k}`)
        // fk.print(`fk ${k}`)
        // fkn.print(`fkn ${k}`)
        // fck.print(`fck ${k}`)


        xk = xkn;
        uk = ukn;
        fk = fkn;
      }
      if (iter++ % 100 == 0)
        console.log(`Iteration ${iter}; max constraint ${max}`)
      eig.GC.flush()
      // console.log('elapsed', new Date() - d, 'ms')
    }), tolVec)
  }

  optimize() {
    // TEMP
    this.opt.set_maxtime(10)
    const res = this.opt.optimize(this.x0)
    this.printVals(res.x, 'result')
  }

  printVals(vector, title) {
    const xVal = []
    const uVal = []
    let tEnd = 0
    const uIdx = this.n * this.shape[0]
    const tIdx = this.dim - 1
    for (let k = 0; k < this.dim; k++) {
      if (k < uIdx) {
        xVal.push(vector.get(k))
      } else if (k < tIdx) {
        uVal.push(vector.get(k))
      } else {
        tEnd = vector.get(k)
      }
    }
    console.log('Values:', title)
    console.log('x:', xVal)
    console.log('u:', uVal)
    console.log('t:', tEnd)
  }
}

class SecondOrderSystem {
  constructor() {
    this.params = {
      m: 1
    }
  }

  shape() {
    return [2, 1]
  }

  dynamics(x, u) {
    return eig.DenseMatrix.fromArray([
      x.vGet(1),
      u.vGet(0) / this.params.m
    ])
  }

  dfdx(x, u) {
    return eig.DenseMatrix.fromArray([
      [0, 1], [0, 0]
    ])
  }

  dfdu(x, u) {
    return eig.DenseMatrix.fromArray([
      [0, 1 / this.params.m]
    ])
  }
}

// TEST FUNCTION
function test() {
  const system = new SecondOrderSystem()
  const xStart = eig.DenseMatrix.fromArray([0, 0])
  const xEnd = eig.DenseMatrix.fromArray([1, 0])
  const collocation = new DirectCollocation(system, 7, xStart, xEnd, 5)
  collocation.optimize()
}

export { test }