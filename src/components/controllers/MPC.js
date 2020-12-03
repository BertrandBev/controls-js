import eig from '@eigen';
import Controller from './controller.js';
import LinearSystem from '../models/linearSystem.js';

class MPC extends Controller {
  static DEBUG = false;
  /**
   * Create a MPC instance
   * @param {Object} system 
   * @param {Trajectory} trajectory 
   * @param {Number} dt 
   */
  constructor(system, trajectory, dt, n, uBounds) {
    super(system);
    this.system = system;
    this.trajectory = trajectory;
    this.dt = dt;
    this.n = MPC.DEBUG ? 3 : n;
    this.uBounds = uBounds;
    // TODO: pass as argument
    this.params = this.system.mpcParams();
  }

  optimizeInner(refTraj, linTraj, dx0) {
    // Minimize 0.5 xT.P.x + qT.x
    // Suject to l <= Ax <= u

    // Solve MPC starting at t
    const a = Date.now();
    const [xn, un] = this.system.shape;
    const dim = (xn + un) * this.n;

    // Create cost matrix
    const P = eig.SparseMatrix.identity(dim, dim).mul(1);
    for (let n = 0; n < xn * this.n; n += 1) {
      if (this.params.xWeight) {
        // Use params weighting
        P.set(n, n, this.params.xWeight[n % xn]);
      } else if ((n % xn) < xn / 2) {
        // Default weighting
        P.set(n, n, 100);
      }
    }
    for (let n = xn * this.n; n < dim; n++) {
      P.set(n, n, 0.01);
    }
    const q = new eig.Matrix(dim, 1);

    // Create dynamic constraints
    const At = new eig.TripletVector(20); // TODO figure out reserve
    const In = eig.Matrix.identity(xn, xn);
    const negOnes = eig.Matrix.ones(xn, 1).mul(-1);
    for (let n = 0; n < this.n; n++) {
      const pt = linTraj[n];
      const x0 = pt.block(0, 0, xn, 1);
      const u0 = pt.block(xn, 0, un, 1);
      if (n >= this.n - 1) {
        continue;
      }

      // Build constraint matrices
      const Ab = this.system.xJacobian(x0, u0).mul(this.dt).matAdd(In);
      const Bb = this.system.uJacobian(x0, u0).mul(this.dt);

      if (MPC.DEBUG) {
        x0.print("x0");
        u0.print("u0");
        Ab.print(`A_${n}`);
        Bb.print(`B_${n}`);
      }

      At.addBlock(n * xn, n * xn, Ab);
      At.addDiag(n * xn, (n + 1) * xn, negOnes);
      At.addBlock(n * xn, this.n * xn + n * un, Bb);

      if (MPC.DEBUG) {
        console.log('=== testing jacobian');
        LinearSystem.testJacobian(this.system);
        console.log('=== jacobian tested!');
      }
    }
    At.addDiag((this.n - 1) * xn, 0, negOnes.mul(-1));
    const uDiag = eig.Matrix.ones(un * this.n, 1);
    At.addDiag(this.n * xn, this.n * xn, uDiag);
    const A = new eig.SparseMatrix(dim, dim, At);
    const lb = new eig.Matrix(dim, 1);
    const ub = new eig.Matrix(dim, 1);
    this.system.bound(dx0);
    // dx0.print('dx0');
    lb.setBlock((this.n - 1) * xn, 0, dx0);
    ub.setBlock((this.n - 1) * xn, 0, dx0);
    for (let k = this.n * xn; k < dim; k++) {
      lb.set(k, this.uBounds.min[k % un]);
      ub.set(k, this.uBounds.max[k % un]);
    }

    // Solve quadratic program
    const x = eig.Solvers.quadProgSolve(P, q, A, lb, ub);

    if (MPC.DEBUG) {
      dx0.print("dx0");
      (new eig.SparseMatrix(P)).print("P");
      q.print("q");
      (new eig.SparseMatrix(A)).print("A");
      lb.print('lb');
      ub.print('ub');
      x.print('result');
    }

    const xTraj = [];
    for (let n = 0; n < this.n; n += 1) {
      const pt = refTraj[n];
      const x0 = pt.block(0, 0, xn, 1);
      const u0 = pt.block(xn, 0, un, 1);
      const x_n = x.block(n * xn, 0, xn, 1).matAdd(x0);
      const u_n = x.block(this.n * xn + n * un, 0, un, 1).matAdd(u0);
      xTraj.push(x_n.vcat(u_n));
    }

    return xTraj;
  }

  optimize(t) {
    // Prepare first pass
    const ptList = [];
    for (let n = 0; n < this.n; n++) {
      const pt = this.trajectory.get(t + n * this.dt);
      ptList.push(pt);
    }
    const [xn, un] = this.system.shape;
    const x0 = ptList[0].block(0, 0, xn, 1);
    const dx0 = this.system.x.matSub(x0);

    // const traj = this.optimizeInner(ptList, ptList, dx0);
    return this.optimizeInner(ptList, ptList, dx0);
  }
}

export default MPC;