import eig from '@eigen'
import _ from 'lodash'
import colors from 'vuetify/lib/util/colors'
import Model from '@/components/models/model.js'

class SecondOrder extends Model {
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'xDot', show: true, derivative: true },
  ])

  static COMMANDS = Object.freeze([
    { name: 'force' }
  ])

  constructor(params = {}) {
    super(SecondOrder.STATES, SecondOrder.COMMANDS, params)
    this.params = {
      m: 1,
      ...params
    }
    // Init graphics
    this.graphics = {}
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    return eig.Matrix.fromArray([
      x.vGet(1),
      u.vGet(0) / this.params.m
    ])
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    return eig.Matrix.fromArray([
      [0, 1], [0, 0]
    ])
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    return eig.Matrix.fromArray([
      [0], [1 / this.params.m]
    ])
  }

  /**
   * Execute a step
   * @param {Matrix} u controls effort
   * @param {Number} dt delta time
   * @param {Array} mouseTarget optional mouse target
   */
  step(u, dt, mouseTarget) {
    const dx = this.dynamics(this.x, u)
    // Override x if target tracking
    if (mouseTarget) {
      // Control cart
      const xVel = 10 * (mouseTarget[0] - this.x.vGet(0));
      this.x.vSet(1, _.clamp(xVel, -15, 15))
      dx.vSet(0, this.x.vGet(1))
    }
    const newX = this.x.matAdd(dx.mul(dt))
    this.bound(newX)
    this.setState(newX)
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      cartWidth: scale,
      cartHeight: scale / 2
    }
    // Cart
    const cart = two.makeRectangle(0, 0, GEOM.cartWidth, GEOM.cartHeight);
    cart.fill = colors.teal.base;
    cart.linewidth = 2;

    // Forces
    const sides = [-GEOM.cartWidth / 2, GEOM.cartWidth / 2].map(x => {
      const fLine = two.makeLine(x, 0, x, 0);
      fLine.linewidth = 2;
      fLine.stroke = colors.red.base;
      const fHead = two.makePolygon(0, 0, 6, 3);
      fHead.rotation = (Math.PI / 2) * Math.sign(x);
      fHead.fill = colors.red.base;
      return { group: two.makeGroup(fLine, fHead), fLine, fHead };
    });

    this.graphics.showControl = true
    this.graphics.setControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.vGet(0) * 5, -100, 100);
        side.group.visible = this.graphics.showControl && (idx - 0.5) * uh > 0;
        side.fHead.translation.x = (Math.sign(uh) * GEOM.cartWidth) / 2 + uh;
        side.fLine.vertices[1].x = side.fHead.translation.x;
      });
    };
    this.graphics.cart = two.makeGroup(
      cart,
      sides[0].group,
      sides[1].group
    );

    // Reference
    const ref = two.makeCircle(0, 0, 8)
    ref.fill = colors.purple.base;
    ref.stroke = colors.purple.darken3;
    ref.linewidth = 2
    this.graphics.ref = ref

    this.graphics.showRef = true
    this.graphics.setRef = (x, y) => {
      this.graphics.ref.visible = this.graphics.showRef
      this.graphics.ref.translation.x = x
      this.graphics.ref.translation.y = y
    }
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, u, trajX) {
    const x = this.x;
    this.graphics.cart.translation.set(...worldToCanvas([x.vGet(0), 0]));
    this.graphics.setControl(u);
    this.graphics.showRef = !!trajX;
    if (trajX) this.graphics.setRef(...worldToCanvas([trajX.vGet(0), 0]))
  }
}

const traj = {
  dt: 0.03614131853427915,
  x: [[-2.0000, 0.0000, 5.0000],
  [-1.9967, 0.1826, 5.0000],
  [-1.9867, 0.3651, 5.0000],
  [-1.9700, 0.5477, 5.0000],
  [-1.9467, 0.7302, 5.0000],
  [-1.9167, 0.9128, 5.0000],
  [-1.8800, 1.0953, 5.0000],
  [-1.8367, 1.2779, 5.0000],
  [-1.7867, 1.4604, 5.0000],
  [-1.7301, 1.6430, 5.0000],
  [-1.6668, 1.8255, 5.0000],
  [-1.5968, 2.0081, 5.0000],
  [-1.5201, 2.1906, 5.0000],
  [-1.4368, 2.3732, 5.0000],
  [-1.3468, 2.5557, 5.0000],
  [-1.2502, 2.7383, 5.0000],
  [-1.1469, 2.9208, 5.0000],
  [-1.0369, 3.1034, 5.0000],
  [-0.9203, 3.2859, 5.0000],
  [-0.7970, 3.4685, 5.0000],
  [-0.6670, 3.6510, 5.0000],
  [-0.5304, 3.8336, 5.0000],
  [-0.3871, 4.0161, 5.0000],
  [-0.2371, 4.1987, 5.0000],
  [-0.0805, 4.3802, 4.9440],
  [0.0805, 4.3802, -4.9440],
  [0.2371, 4.1987, -5.0000],
  [0.3871, 4.0161, -5.0000],
  [0.5304, 3.8336, -5.0000],
  [0.6670, 3.6510, -5.0000],
  [0.7970, 3.4685, -5.0000],
  [0.9203, 3.2859, -5.0000],
  [1.0369, 3.1034, -5.0000],
  [1.1469, 2.9208, -5.0000],
  [1.2502, 2.7383, -5.0000],
  [1.3468, 2.5557, -5.0000],
  [1.4368, 2.3732, -5.0000],
  [1.5201, 2.1906, -5.0000],
  [1.5968, 2.0081, -5.0000],
  [1.6668, 1.8255, -5.0000],
  [1.7301, 1.6430, -5.0000],
  [1.7867, 1.4604, -5.0000],
  [1.8367, 1.2779, -5.0000],
  [1.8800, 1.0953, -5.0000],
  [1.9167, 0.9128, -5.0000],
  [1.9467, 0.7302, -5.0000],
  [1.9700, 0.5477, -5.0000],
  [1.9867, 0.3651, -5.0000],
  [1.9967, 0.1826, -5.0000],
  [2.0000, 0.0000, -5.0000],
  [1.9967, -0.1826, -5.0000],
  [1.9867, -0.3651, -5.0000],
  [1.9700, -0.5477, -5.0000],
  [1.9467, -0.7302, -5.0000],
  [1.9167, -0.9128, -5.0000],
  [1.8800, -1.0953, -5.0000],
  [1.8367, -1.2779, -5.0000],
  [1.7867, -1.4604, -5.0000],
  [1.7301, -1.6430, -5.0000],
  [1.6668, -1.8255, -5.0000],
  [1.5968, -2.0081, -5.0000],
  [1.5201, -2.1906, -5.0000],
  [1.4368, -2.3732, -5.0000],
  [1.3468, -2.5557, -5.0000],
  [1.2502, -2.7383, -5.0000],
  [1.1469, -2.9208, -5.0000],
  [1.0369, -3.1034, -5.0000],
  [0.9203, -3.2859, -5.0000],
  [0.7970, -3.4685, -5.0000],
  [0.6670, -3.6510, -5.0000],
  [0.5304, -3.8336, -5.0000],
  [0.3871, -4.0161, -5.0000],
  [0.2371, -4.1987, -4.9440],
  [0.0805, -4.3802, 4.9440],
  [-0.0805, -4.3802, 5.0000],
  [-0.2371, -4.1987, 5.0000],
  [-0.3871, -4.0161, 5.0000],
  [-0.5304, -3.8336, 5.0000],
  [-0.6670, -3.6510, 5.0000],
  [-0.7970, -3.4685, 5.0000],
  [-0.9203, -3.2859, 5.0000],
  [-1.0369, -3.1034, 5.0000],
  [-1.1469, -2.9208, 5.0000],
  [-1.2502, -2.7383, 5.0000],
  [-1.3468, -2.5557, 5.0000],
  [-1.4368, -2.3732, 5.0000],
  [-1.5201, -2.1906, 5.0000],
  [-1.5968, -2.0081, 5.0000],
  [-1.6668, -1.8255, 5.0000],
  [-1.7301, -1.6430, 5.0000],
  [-1.7867, -1.4604, 5.0000],
  [-1.8367, -1.2779, 5.0000],
  [-1.8800, -1.0953, 5.0000],
  [-1.9167, -0.9128, 5.0000],
  [-1.9467, -0.7302, 5.0000],
  [-1.9700, -0.5477, 5.0000],
  [-1.9867, -0.3651, 5.0000],
  [-1.9967, -0.1826, 5.0000],
  [-2.0000, 0.0000, 5.0000]]
}

export { SecondOrder, traj }