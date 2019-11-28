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
    // this.printVals(lower, 'lower')
    // this.printVals(upper, 'upper')
  }

  getVector(arr, idx, len) {
    const vec = new eig.DenseMatrix(len, 1)
    for (let k = 0; k < len; k++) {
      vec.vSet(k, arr[idx + k])
    }
    return vec
  }

  // res[nConst] = function(x)

  constraint(x, grad, res) {
    // Not useful if put back in function below
    const nx = this.shape[0]
    const nu = this.shape[1]
    const nConst = (this.n - 1) * nx

    // const d = new Date()
    // Retreive initial values
    const dhdt = 1 / (this.n - 1)
    const h = x[this.dim - 1] * dhdt
    let xkIdx = 0
    let ukIdx = nx * this.n;
    let xk = this.getVector(x, 0, nx);
    let uk = this.getVector(x, nx * this.n, nu)
    let fk = this.system.dynamics(xk, uk);

    // Derivatives initial values
    let Jxk = grad ? this.system.xJacobian(xk, uk) : null;
    let Juk = grad ? this.system.uJacobian(xk, uk) : null;


    // console.log('## ITER')
    // const xc = []
    // x.forEach(val => xc.push(val))
    // console.log('x', xc)

    // Loop for all colocation points
    let max = 0
    for (let k = 0; k < this.n - 1; k++) {
      const xkn = this.getVector(x, xkIdx + nx, nx)
      const ukn = this.getVector(x, ukIdx + nu, nu);
      const fkn = this.system.dynamics(xkn, ukn);
      // Compute collocation point
      const xck = xk.matAdd(xkn).div(2).matAdd(fk.matSub(fkn).mul(h / 8));
      const uck = uk.matAdd(ukn).div(2);
      const fck = this.system.dynamics(xck, uck);
      // Add constraint
      const c = xk.matSub(xkn).matAdd(fk.matAdd(fck.mul(4)).matAdd(fkn).mul(h / 6))
      for (let i = 0; i < nx; i++) {
        const cIdx = k * nx + i;
        res[cIdx] = c.vGet(i)
        max = Math.max(max, Math.pow(c.vGet(i), 2))
      }

      // Compute jacobians
      if (grad) {
        let Jxkn = this.system.xJacobian(xkn, ukn)
        let Jukn = this.system.uJacobian(xkn, ukn)
        let Jxck = this.system.xJacobian(xck, uck)
        let Juck = this.system.uJacobian(xck, uck)
        // Compute derivatives
        const Inx = eig.DenseMatrix.identity(nx, nx)
        const dXckdXk = Inx.div(2).matAdd(Jxk.mul(h / 8))
        const dXckdXkn = Inx.div(2).matSub(Jxkn.mul(h / 8))
        const dXckdUk = Juk.mul(h / 8)
        const dXckdUkn = Jukn.mul(-h / 8)
        const dXckdH = fk.matSub(fkn).div(8)
        // Cost derivatives
        const dCdXk = Inx.matAdd(Jxk.matAdd(Jxck.matMul(dXckdXk).mul(4)).mul(h / 6))
        const dCdXkn = Inx.mul(-1).matAdd(Jxkn.matAdd(Jxck.matMul(dXckdXkn).mul(4)).mul(h / 6))
        const dCdUk = Juk.matAdd(Jxck.matMul(dXckdUk).mul(4)).matAdd(Juck.mul(2)).mul(h / 6)
        const dCdUkn = Jukn.matAdd(Jxck.matMul(dXckdUkn).mul(4)).matAdd(Juck.mul(2)).mul(h / 6)
        const dCdH = fk.matAdd(fck.mul(4)).matAdd(fkn).div(6).matAdd(Jxck.matMul(dXckdH).mul(h * 4 / 6))
        // Populate gradients
        for (let i = 0; i < nx; i++) {
          const cIdx = k * nx + i;
          // Handle x values
          for (let j = 0; j < nx; j++) {
            grad[cIdx * this.dim + xkIdx + j] = dCdXk.get(i, j)
            grad[cIdx * this.dim + xkIdx + nx + j] = dCdXkn.get(i, j)
          }
          // Handle u values
          for (let j = 0; j < nu; j++) {
            grad[cIdx * this.dim + ukIdx + j] = dCdUk.get(i, j)
            grad[cIdx * this.dim + ukIdx + nu + j] = dCdUkn.get(i, j)
          }
          // Handle t
          grad[cIdx * this.dim + this.dim - 1] = dCdH.get(i, 0) * dhdt
        }
        // Propagate values
        Jxk = Jxkn;
        Juk = Jukn;
      }

      // Propagate values
      xk = xkn;
      uk = ukn;
      fk = fkn;
      xkIdx += nx;
      ukIdx += nu;


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



    }
    // if (iter++ % 100 == 0)
    //   console.log(`Iteration ${iter}; max constraint ${max}`)
    eig.GC.flush()
    // console.log('elapsed', new Date() - d, 'ms')
  }

  testGrad() {
    const nx = this.shape[0]
    const nu = this.shape[1]
    const nConst = (this.n - 1) * nx
    const x0 = [...Array(this.dim)].map((_, idx) => idx + 1)
    const grad0 = [...Array(this.dim * nConst)].map(() => 0)
    const ret0 = [...Array(nConst)].map(() => 0)
    this.constraint(x0, grad0, ret0)

    const eps = 1e-8
    const nGrad = [...Array(this.dim * nConst)].map(() => 0)
    for (let k = 0; k < this.dim; k++) {
      const x = [...x0]
      const grad = [...grad0].map(() => 0)
      const ret = [...ret0].map(() => 0);
      x[k] += eps;
      this.constraint(x, grad, ret)
      for (let l = 0; l < nConst; l++) {
        nGrad[l * this.dim + k] = (ret[l] - ret0[l]) / eps
      }
    }
    // Test gradients
    const diff = []
    for (let k = 0; k < this.dim * nConst; k++) {
      diff.push(Math.abs(nGrad[k] - grad0[k]) < 1e-4 ? 0 : nGrad[k] - grad0[k])
    }
    console.log('function tested')
    console.log('x0', x0)
    console.log('ret0', ret0)
    console.log('grad0', grad0)
    console.log('grad', nGrad)
    console.log('diff', diff)
  }

  addDynamicContraints() {
    const nx = this.shape[0]
    const nu = this.shape[1]
    const nConst = (this.n - 1) * nx
    const tolVec = nlopt.Vector.fromArray([...Array(nConst)].map(() => 1e-4))
    let iter = 0;
    this.opt.add_equality_mconstraint(nlopt.VectorFunction.fromLambda((x, grad, res) => {
      return this.constraint(x, grad, res)
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

// class SecondOrderSystemTest {
//   constructor() {
//     this.params = {
//       m: 1
//     }
//   }

//   shape() {
//     return [2, 1]
//   }

//   dynamics(x, u) {
//     return eig.DenseMatrix.fromArray([
//       x.vGet(1) + x.vGet(0) * 0.3 - u.vGet(0) * 0.23,
//       u.vGet(0) / this.params.m + x.vGet(0) * 0.1 - x.vGet(1) * 0.7
//     ])
//   }

//   xJacobian(x, u) {
//     return eig.DenseMatrix.fromArray([
//       [0.3, 1], [0.1, -0.7]
//     ])
//   }

//   uJacobian(x, u) {
//     return eig.DenseMatrix.fromArray([
//       [-0.23], [1 / this.params.m]
//     ])
//   }
// }

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

  xJacobian(x, u) {
    return eig.DenseMatrix.fromArray([
      [0, 1], [0, 0]
    ])
  }

  uJacobian(x, u) {
    return eig.DenseMatrix.fromArray([
      [0], [1 / this.params.m]
    ])
  }
}

// TEST FUNCTION
function test() {
  const system = new SecondOrderSystem()
  const xStart = eig.DenseMatrix.fromArray([0, 0])
  const xEnd = eig.DenseMatrix.fromArray([1, 0])
  const collocation = new DirectCollocation(system, 15, xStart, xEnd, 5)
  collocation.optimize()
  // collocation.testGrad()
}

export { test }