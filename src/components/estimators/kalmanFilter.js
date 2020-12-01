import eig from '@eigen'
import LinearSystem from '@/components/models/linearSystem.js'
import { addNoise } from '@/components/math.js'

class KalmanFilter {
  constructor(system) {
    this.system = system
    this.watchers = new Set();
  }

  ready() {
    return !!this.P && !!this.Q
  }

  reset(P, Q) {
    // Init mean & covariance
    const x = new eig.Matrix(this.system.x);
    // Store data
    eig.GC.set(this, 'x', x);
    eig.GC.set(this, 'P', P);
    eig.GC.set(this, 'Q', Q);
  }

  predict(u, dt) {
    // Retrieve system jacobian
    const [Jx, Ju] = LinearSystem.linearizeSystem(this.system, this.x, u); // TODO: use real jacobian if available
    // Transform mean & covariance matrices
    const dx = this.system.dynamics(this.x, u).mul(dt);
    this.x.matAddSelf(dx);
    this.system.bound(this.x)
    const dP = Jx.matMul(this.P).matMul(Jx.transpose()).matAdd(this.Q).mul(dt);
    this.P.matAddSelf(dP);
    // Notify watchers
    this.watchers.forEach(fun => fun())
  }

  update(sensor) {
    // Take measurement
    const z = sensor.measurement(sensor, this.system.x);
    const zHat = sensor.measurement(sensor, this.x);
    // Add measurement noise
    const cov = new eig.Matrix(sensor.noise);
    addNoise(z, cov);
    const H = LinearSystem.linearize(x => sensor.measurement(sensor, x), this.x);
    const R = new eig.Matrix(sensor.noise);
    // Compute Kalman gain
    const PHt = this.P.matMul(H.transpose());
    const K = PHt.matMul((H.matMul(PHt).matAdd(R)).inverse());
    // Update mean & covariance
    this.x.matAddSelf(K.matMul(z.matSub(zHat)));
    this.P.matSubSelf(K.matMul(H).matMul(this.P));
    // Notify watchers
    this.watchers.forEach(fun => fun())
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
}

export default KalmanFilter