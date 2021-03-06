import _ from 'lodash'
import nlopt from '@nlopt'
import eig from '@eigen'

/**
 * Direct collocation params
 * @param {Number} nPts 
 * @param {Number} uBounds {min, max} 
 * @param {Array} anchors [{t in [0, 1], x}]
 */
const defaultParams = {
  maxTime: 60,
  maxEval: 1e6
}

class DirectCollocation {
  static FREE = NaN;

  /**
   * 
   * @param {Object} system 
   */
  constructor(system) {
    this.system = system
  }

  setParams(params) {
    // Control params
    console.assert(params.nPts >= 2, "The number of points must be positive")
    this.params = {
      ...defaultParams,
      ...params
    }
    this.n = params.nPts
    // Compute dimensionality
    this.shape = this.system.shape
    this.dim = (this.shape[0] + this.shape[1]) * this.n + 1
    const algorithm = nlopt.Algorithm.LD_SLSQP;
    this.opt = new nlopt.Optimize(algorithm, this.dim)

    // Set objective
    this.opt.setMinObjective((x, grad) => {
      const tEnd = x[this.dim - 1]
      if (grad) {
        for (let k = 0; k < this.dim - 1; k++) {
          grad[k] = 0
        }
        grad[this.dim - 1] = 1
      }
      return tEnd
    }, 1e-5);

    // Add dynamic constraint
    this.addDynamicContraints()

    // Set bounds
    this.setBounds(params.uBounds, params.anchors)
  }

  delete() {
    nlopt.GC.flush()
  }

  setBounds(uBounds, anchors) {
    const lower = []
    const upper = []
    const x0 = []
    const uIdx = this.n * this.shape[0]
    const tIdx = this.dim - 1
    const INF = 1e500;
    function setPoint(low, hight, x) {
      lower.push(low)
      upper.push(hight)
      x0.push(x)
    }
    for (let k = 0; k < this.dim; k++) {
      if (k < uIdx) {
        // x
        setPoint(-INF, INF, 0)
      } else if (k < tIdx) {
        // u
        const min = uBounds.min[(k - uIdx) % this.shape[1]]
        const max = uBounds.max[(k - uIdx) % this.shape[1]]
        setPoint(min, max, (min + max) / 2)
      } else {
        // tEnd
        setPoint(0.1, INF, 1)
      }
    }
    // Add anchors
    anchors.forEach(a => {
      const idx = _.clamp(Math.floor(a.t * this.n), 0, this.n - 1) * this.shape[0]
      console.log(a.x)
      for (let k = 0; k < this.shape[0]; k++) {
        if (!isNaN(a.x[k])) {
          upper[idx + k] = a.x[k];
          lower[idx + k] = a.x[k];
          x0[idx + k] = a.x[k];
        }
      }
    })
    // TODO: add initial guess
    this.opt.setLowerBounds(lower)
    this.opt.setUpperBounds(upper)
    this.x0 = x0
  }

  getVector(arr, idx, len) {
    const vec = new eig.Matrix(len, 1)
    for (let k = 0; k < len; k++) {
      vec.set(k, arr[idx + k])
    }
    return vec
  }

  // res[nConst] = function(x)

  constraint(x, grad, res, iTol = 0) {
    // Not useful if put back in function below
    const nx = this.shape[0]
    const nu = this.shape[1]
    const nConst = (this.n - 1) * nx

    const a = Date.now()
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
    // console.log('JS ', x[0], x[1], x[this.dim - 2], x[this.dim - 1]);

    // Zero-out gradient
    if (grad) {
      for (let i = 0; i < nConst * this.dim; i++) {
        grad[i] = 0;
      }
    }

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
        if (iTol !== 0) {
          res[cIdx] = - Math.sign(iTol) * c.get(i);
        } else {
          res[cIdx] = c.get(i);
        }
        max = Math.max(max, Math.pow(c.get(i), 2))
      }

      // Compute jacobians
      if (grad) {
        let Jxkn = this.system.xJacobian(xkn, ukn)
        let Jukn = this.system.uJacobian(xkn, ukn)
        let Jxck = this.system.xJacobian(xck, uck)
        let Juck = this.system.uJacobian(xck, uck)
        // Compute derivatives
        const Inx = eig.Matrix.identity(nx, nx)
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
    console.log('iteration time', Date.now() - a);

    // TEMP


    // if (grad)
    // console.log('JS ', grad[0], grad[nConst * this.dim - 1]);
    // console.log('JS RES', res[0], res[nConst - 1])

    // if (iter++ % 100 == 0)
    //   console.log(`Iteration ${iter}; max constraint ${max}`)
    // eig.GC.flush()
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
    const [nx, nu] = this.shape;
    const nConst = (this.n - 1) * nx
    const tolVec = [...Array(nConst)].map(() => 1e-4);
    this.opt.addEqualityMConstraint((x, grad, res) => {
      this.constraint(x, grad, res);
    }, tolVec);
    // const tolVec2 = nlopt.Vector.fromArray([...Array(nConst)].map(() => 1e-4))
    // this.opt.addInequalityMConstraint(nlopt.VectorFunction.fromLambda((x, grad, res) => {
    //   this.constraint(x, grad, res, -1);
    // }), tolVec2)
  }

  optimize() {
    this.opt.setMaxtime(this.params.maxTime)
    this.opt.setMaxeval(this.params.maxEval)
    const res = this.opt.optimize(this.x0)
    console.log('Optimization returned ', res, res.x)
    if (!res.success) {
      console.log('Optimization failed')
      return null
    }
    let [xList, uList, tEnd] = this.unpack(res.x)
    console.log('tEnd', tEnd);
    let arr = xList.map((x, idx) => {
      return new eig.Matrix(x).vcat(new eig.Matrix(uList[idx]))
    })
    tEnd = Math.max(tEnd, 0.1); // Safeguard for hold loop
    const dt = tEnd / xList.length;
    // Array hold
    const first = eig.Matrix(arr[0]);
    const last = eig.Matrix(arr[arr.length - 1]);
    const [nx, nu] = this.shape;
    for (let k = nx; k < nx + nu; k++) {
      first.set(k, 0);
      last.set(k, 0);
    }
    for (let k = 0; k < this.params.holdTime / dt; k++) {
      arr.unshift(first);
      arr.push(last);
    }
    // Array reverse
    if (this.params.reverse) {
      arr = this.system.reverse(arr)
    }
    return { x: arr, dt }
  }

  unpack(vector) {
    const xList = []
    const uList = []
    let tEnd = vector[this.dim - 1]
    const uIdx = this.n * this.shape[0]
    const tIdx = this.dim - 1
    function slice(idx, len) {
      return [...Array(len)].map((_, k) => vector[idx + k])
    }
    for (let k = 0; k < uIdx; k += this.shape[0]) {
      xList.push(slice(k, this.shape[0]))
    }
    for (let k = uIdx; k < this.dim - 1; k += this.shape[1]) {
      uList.push(slice(k, this.shape[1]))
    }
    return [xList, uList, tEnd]
  }
}

export default DirectCollocation