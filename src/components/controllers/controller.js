import eig from '@eigen'

class Controller {
  constructor(system) {
    this.system = system
  }

  getCommand(x, t) {
    throw new Error('Must be overridden')
  }
}

export default Controller