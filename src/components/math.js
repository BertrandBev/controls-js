import eig from '@eigen'

function wrapAngle(angle) {
  let mod = (angle + Math.PI) % (2 * Math.PI)
  if (mod < 0) { mod += 2 * Math.PI }
  return mod - Math.PI
}

function sqr(val) {
  return Math.pow(val, 2)
}

function matFromDiag(diag) {
  const n = diag.length
  const mat = [...Array(n)].map(() => [...Array(n)].map(() => 0))
  for (let k = 0; k < n; k++) {
    mat[k][k] = diag[k]
  }
  return mat
}

function addNoise(x, cov) {
  // Add measurement noise (Consider adding that in a library)
  const mean = new eig.Matrix(x.rows(), 1);
  const rdn = eig.Random.normal(mean, cov, 1);
  x.matAddSelf(rdn);
}

// A multivariate gaussian class
class Gaussian {
  constructor(mean, cov) {
    this.setMean(mean)
    this.setCov(cov)
  }

  setMean(mean) {
    eig.GC.set(this, 'mean', mean)
  }

  setCov(cov) {
    this.absDet = Math.abs(cov.det());
    const invCov = cov.inverse();
    eig.GC.set(this, 'invCov', invCov)
  }

  delete() {
    eig.GC.popException(this.mean)
    eig.GC.popException(this.invCov)
  }

  density(x) {
    const k = this.mean.rows();
    const delta = x.matSub(this.mean);
    const scalar = delta.transpose().matMul(this.invCov).matMul(delta).get(0, 0);
    return Math.exp(-0.5 * scalar) / Math.sqrt(Math.pow(2 * Math.PI, k) * this.absDet)
  }
}


/**
 * TODO: add to shared lib
 * @param {Array} traj 
 * @param {Number} dt 
 * @param {Number} tau Decay characteristic time for low-pass
 */
function differenciate(traj, dt, tau = 1e-8, loop = false) {
  const dTraj = []
  for (let k = 0; k < traj.length; k++) {
    const div = traj[(k + 1) % traj.length].matSub(traj[k % traj.length]).div(dt)
    dTraj.push(div)
  }
  return smooth(dTraj, dt, tau)
}

/**
 * 
 * @param {Array} traj 
 * @param {Number} tau Decay characteristic time for low-pass
 */
function smooth(traj, dt, tau = 1e-8) {
  if (traj.length === 0) {
    return []
  }
  const decay = Math.exp(-2 * Math.PI * dt / tau)
  let val = traj[0]
  const smoothed = []
  for (let k = 0; k < 2 * traj.length; k++) {
    val = val.mul(decay).matAdd(traj[k % traj.length].mul(1 - decay))
    if (k >= traj.length) {
      smoothed.push(val)
    }
  }
  return smoothed
}

export { wrapAngle, sqr, matFromDiag, addNoise, Gaussian, differenciate, smooth }