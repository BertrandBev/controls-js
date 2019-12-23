import Trajectory from '@/components/planners/trajectory.js'

class Controller {
  constructor(system) {
    this.system = system
  }

  getCommand() {
    throw new Error('Must be overridden')
  }

  /**
   * Simulate
   */
  simulate(dt, duration) {
    const x = this.system.x
    const arr = []
    for (let t = 0; t < duration; t += dt) {
      const u = this.getCommand(t);
      const dx = this.system.dynamics(x, u);
      arr.push(x.vcat(u))
      x.matAddSelf(dx.mul(dt))
    }
    const traj = new Trajectory(this.system)
    traj.set(arr, dt)
    return traj
  }
}

export default Controller