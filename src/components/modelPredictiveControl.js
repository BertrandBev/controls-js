import eig from '@eigen'

class ModelPredictiveControl {
  /**
   * Create a MPC instance
   * @param {Object} system 
   * @param {Interpolator} trajectory 
   * @param {Number} dt 
   */
  constructor(system, trajectory, dt, n, uBounds) {
    this.system = system
    this.trajectory = trajectory
    this.dt = dt
    this.n = n
    this.uBounds = uBounds
  }

  reset() {
    this.t = Date.now() / 1000
    this.trajectory.reset()
  }

  getCommand() {
    // Minimize 0.5 xT.P.x + qT.x
    // Suject to l <= Ax <= u

    // Solve MPC starting at t
    const a = Date.now()
    const t = Date.now() / 1000
    const [xn, un] = this.system.shape()
    const dim = (xn + un) * this.n
    // Create cost matrix
    const P = eig.SparseMatrix.identity(dim, dim).mul(1)
    for (let n = 0; n < xn * this.n; n += 2) {
      P.set(n, n, 10)
    }
    for (let n = xn * this.n; n < dim; n++) {
      P.set(n, n, 0.01)
    }
    // P.print('P (cost)')
    const q = new eig.Matrix(dim, 1)
    // Create dynamics constraint: CE^T x + ce0 = 0
    const At = new eig.TripletVector(10) // TODO figure out reserve
    // new eig.Matrix(this.n * xn, dim)
    const In = eig.Matrix.identity(xn, xn)
    const negOnes = eig.Matrix.ones(xn, 1).mul(-1)
    const [x0list, u0list] = [[], []]
    for (let n = 0; n < this.n; n++) {
      const pt = this.trajectory.get(t + n * this.dt)
      const x0 = pt.block(0, 0, xn, 1);
      const u0 = pt.block(xn, 0, un, 1);
      x0list.push(x0)
      u0list.push(u0)
      if (n >= this.n - 1) {
        continue
      }
      // Build constraint matrices
      const Ab = this.system.xJacobian(x0, u0).mul(this.dt).matAdd(In)
      const Bb = this.system.uJacobian(x0, u0).mul(this.dt)
      // Ab.print(`A_${n}`)
      // Bb.print(`B_${n}`)
      At.addBlock(n * xn, n * xn, Ab)
      At.addDiag(n * xn, (n + 1) * xn, negOnes)
      At.addBlock(n * xn, this.n * xn + n * un, Bb)
    }
    At.addDiag((this.n - 1) * xn, 0, negOnes.mul(-1))
    const uDiag = eig.Matrix.ones(un, 1)
    At.addDiag(this.n * xn, this.n * xn, uDiag)
    const A = new eig.SparseMatrix(dim, dim, At)
    const AA = new eig.SparseMatrix(A)
    // A.print("At")


    const lb = new eig.Matrix(dim, 1)
    const ub = new eig.Matrix(dim, 1)
    const dx0 = this.system.x.matSub(x0list[0])
    this.system.bound(dx0)
    lb.setBlock((this.n - 1) * xn, 0, dx0);
    ub.setBlock((this.n - 1) * xn, 0, dx0);
    for (let k = this.n * xn; k < dim; k++) {
      lb.vSet(k, this.uBounds.min[k % un])
      ub.vSet(k, this.uBounds.max[k % un])
    }

    // lb.print('lb')
    // ub.print('ub')

    // Solve quadratic program
    const x = eig.QuadProgSolver.solve(P, q, A, lb, ub);
    // x.print('result')
    // console.log('done')
    const xTraj = []
    for (let k = 0; k < this.n; k += 1) {
      // x.transpose().print(`x_${k}`)
      const xk = x0list[k] // x.block(k * xn, 0, xn, 1).matAdd(x0list[k])
      const uk = u0list[k] //x.block(this.n * xn + k * un, 0, un, 1).matAdd(u0list[k])
      // x.block(this.n * xn + k * un, 0, un, 1).print(`u_${k}`)
      xTraj.push(xk.vcat(uk))
      // if (k == 0)
      //   uk.print('u0')
    }
    // console.log('delta_t', Date.now() - a)

    // TEMP CONTROL RESULT
    // AA.print('A matrix')
    // AA.toDense().matMul(x).print('A validation')

    return xTraj
  }

  getCommandOld() {
    // const a = Date.now()
    // Solve MPC starting at t
    const t = Date.now() / 1000
    const [xn, un] = this.system.shape()
    const dim = (xn + un) * this.n
    // Create cost matrix
    const G = eig.Matrix.identity(dim, dim).mul(10)
    for (let n = 0; n < xn * this.n; n += 2) {
      // G.set(n, n, 10)
    }
    for (let n = xn * this.n; n < dim; n++) {
      G.set(n, n, 0.1)
    }
    const g0 = new eig.Matrix(dim, 1)
    // Create dynamics constraint: CE^T x + ce0 = 0
    const CEt = new eig.Matrix(this.n * xn, dim)
    const In = eig.Matrix.identity(xn, xn)
    const Ineg = eig.Matrix.identity(xn, xn).mul(-1)
    const [x0list, u0list] = [[], []]
    for (let n = 0; n < this.n; n++) {
      const pt = this.trajectory.get(t + n * this.dt)
      const x0 = pt.block(0, 0, xn, 1);
      const u0 = pt.block(xn, 0, un, 1);
      x0list.push(x0)
      u0list.push(u0)
      if (n >= this.n - 1) {
        continue
      }
      // Build constraint matrices
      const Ab = this.system.xJacobian(x0, u0).mul(this.dt).matAdd(In)
      const Bb = this.system.uJacobian(x0, u0).mul(this.dt)
      // Ab.print(`A_${n}`)
      // Bb.print(`B_${n}`)
      CEt.setBlock(n * xn, n * xn, Ab)
      CEt.setBlock(n * xn, (n + 1) * xn, Ineg)
      CEt.setBlock(n * xn, this.n * xn + n * un, Bb)
    }
    CEt.setBlock((this.n - 1) * xn, 0, Ineg)
    const CE = CEt.transpose()
    const ce0 = new eig.Matrix(this.n * xn, 1);
    const dx0 = this.system.x.matSub(x0list[0])
    // dx0.print('dx0')
    ce0.setBlock((this.n - 1) * xn, 0, dx0);

    // CEt.print('CEt')
    // ce0.print('ce0')


    // Create inequality constraints: CI^T x + ci0 >= 0
    const CIt = new eig.Matrix(2 * this.n * un, dim)
    const ci0 = new eig.Matrix(2 * this.n * un, 1)
    for (let n = 0; n < this.n * un; n++) {
      // CIt.set(2 * n, this.n * xn + n, 1)
      // ci0.vSet(2 * n, -this.uBounds.min[n % un])
      // CIt.set(2 * n + 1, this.n * xn + n, -1)
      // ci0.vSet(2 * n + 1, this.uBounds.max[n % un])
    }
    // CIt.print('CIt')
    // ci0.print('ci0')
    const CI = CIt.transpose()

    // Solve quadratic program
    const x = new eig.Matrix(dim, 1)
    const res = eig.QuadProgSolver.solve(G, g0, CE, ce0, CI, ci0, x)
    const xTraj = []
    for (let k = 0; k < this.n; k += 1) {
      // x.transpose().print(`x_${k}`)
      const xk = x.block(k * xn, 0, xn, 1).matAdd(x0list[k])
      const uk = x.block(this.n * xn + k * un, 0, un, 1).matAdd(u0list[k])
      // x.block(this.n * xn + k * un, 0, un, 1).print(`u_${k}`)
      xTraj.push(xk.vcat(uk))
    }
    // console.log('delta_t', Date.now() - a)

    // TEMP CONTROL RESULT
    // CEt.matMul(x).matAdd(ce0).print('CE validation')
    // CIt.matMul(x).matAdd(ci0).print('CI validation')

    return xTraj
  }
}

export { ModelPredictiveControl }