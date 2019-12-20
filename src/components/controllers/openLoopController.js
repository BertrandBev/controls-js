import Controller from './controller.js'

class OpenLoopController extends Controller {
  constructor(system, trajectory) {
    super(system)
    this.trajectory = trajectory
  }

  reset() {
    if (!this.trajectory.ready()) {
      return console.error('The trajectory must be ready')
    }
    this.trajectory.reset()
    let [xn, un] = this.system.shape
    const x = this.trajectory.array[0].block(0, 0, xn, 1);
    this.system.setState(x);
  }

  getCommand(t) {
    let [xn, un] = this.system.shape
    const x = this.trajectory.get(t)
    return x.block(xn, 0, un, 1)
  }
}

export default OpenLoopController