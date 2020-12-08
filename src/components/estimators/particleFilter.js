import eig from '@eigen';
import _ from 'lodash';
import { addNoise, Gaussian } from '@/components/math.js';


class Particle {
  constructor(system, params) {
    this.params = params;
    this.system = new system.constructor();
    this.weight = 1;
    switch (params.distribution) {
      case 'exact':
        // Copy state
        this.system.setState(system.x);
        break;
      case 'uniform': {
        // Sample state uniformely
        const x = eig.Matrix.random(system.shape[0], 1);
        for (let k = 0; k < x.rows(); k++) {
          const min = params.range.min[k];
          const max = params.range.max[k];
          this.system.x.set(k, min + (max - min) * x.get(k));
        }
        break;
      }
      case 'normal': {
        // Sample state from a multimodal gaussian density
        break;
      }
    }
  }

  clone() {
    const newParticle = new Particle(this.system, this.params);
    newParticle.system.setState(this.system.x);
    return newParticle;
  }

  delete() {
    this.system.delete();
  }

  predict(u, dt) {
    this.system.step(u, dt);
    // Add process noise
    const cov = new eig.Matrix(this.params.processNoise).mul(dt);
    addNoise(this.system.x, cov);
  }

  update(sensor, z) {
    // Simulate measurement
    const zHat = sensor.measurement(sensor, this.system.x);
    // Create gaussian if needed TODO: clear on parameter update
    if (!sensor.gaussian) {
      const mean = new eig.Matrix(zHat.rows(), 1);
      const cov = new eig.Matrix(sensor.noise);
      sensor.gaussian = new Gaussian(mean, cov);
    }
    // Update weight according to measurement likelihood
    const val = sensor.gaussian.density(zHat.matSub(z));
    this.weight *= val;
  }
}

class ParticleFilter {
  constructor(system) {
    this.system = system;
    this.particles = [];
    this.watchers = new Set();
  }

  ready() {
    return true;
  }

  reset(params) {
    this.params = _.cloneDeep(params);
    this.particles.forEach(p => p.delete());
    this.particles = [];
    for (let k = 0; k < params.nPts; k++) {
      const p = new Particle(this.system, params);
      this.particles.push(p);
    }
    this.normalizeWeights();
  }

  predict(u, dt) {
    this.particles.forEach(particle => particle.predict(u, dt));
    // Notify watchers
    this.watchers.forEach(fun => fun());
  }

  normalizeWeights() {
    // Pseudo-normalize weight (~soft max?)
    const weights = this.particles.map(p => p.weight);
    const max = _.max(weights);
    const W = max; // TEMP (find better way)
    this.particles.forEach(p => p.weight /= W);
  }

  update(sensor) {
    // Take measurement
    const z = sensor.measurement(sensor, this.system.x);
    // Add measurement noise
    const cov = new eig.Matrix(sensor.noise);
    addNoise(z, cov);
    // Update particles
    this.particles.forEach(particle => particle.update(sensor, z));
    this.normalizeWeights();
    // Notify watchers
    this.watchers.forEach(fun => fun());
  }

  resample() {
    // Stochastic sampling algorithm
    const n = this.particles.length;
    const newParticles = [];
    let index = Math.floor(Math.random() * n);
    let beta = 0.0;
    const weights = this.particles.map(p => p.weight);
    const mw = _.max(weights);
    for (let k = 0; k < n; k++) {
      beta += Math.random() * 2.0 * mw;
      while (beta > weights[index]) {
        beta -= weights[index];
        index = (index + 1) % n;
      }
      const newParticle = this.particles[index].clone();
      newParticles.push(newParticle);
    }
    this.particles.forEach(p => p.delete());
    this.particles = newParticles;
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
}

export default ParticleFilter;