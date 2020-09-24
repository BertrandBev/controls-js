import eig from '@eigen'
import _ from 'lodash'
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js'
import Model from '@/components/models/model.js'

class CartPole extends Model {
  static NAME = 'cart pole';
  static TAG = 'cartPole';
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'theta', angle: true, min: -Math.PI, max: Math.PI, show: true },
    { name: 'xDot' },
    { name: 'thetaDot' }
  ])
  static COMMANDS = Object.freeze([
    { name: 'force' }
  ])

  constructor(params = {}) {
    super(CartPole.STATES, CartPole.COMMANDS, {
      ...params,
      g: 9.81,
      l: 1,
      mp: 0.2,
      mc: 1,
      mu: 0.5,
    })
  }

  trim() {
    return {
      x: eig.Matrix.fromArray([0, Math.PI, 0, 0]),
      u: new eig.Matrix.fromArray([0])
    }
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x)
    x.vSet(1, wrapAngle(x.vGet(1)))
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [x, theta, dx, dtheta]
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const dx = x.block(2, 0, 2, 1)
    const den = p.mc + p.mp * sqr(s)
    const ddx = eig.Matrix.fromArray([
      (u.vGet(0) + p.mp * s * (p.l * sqr(x.vGet(3)) + p.g * c)) / den, //- p.mu * x.vGet(2),
      -(u.vGet(0) * c + p.mp * p.l * sqr(x.vGet(3)) * c * s + (p.mp + p.mc) * p.g * s) / p.l / den //- p.mu * x.vGet(3)
    ])
    return dx.vcat(ddx)
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params
    const td = x.vGet(3)
    const f = u.vGet(0)
    const [c, s] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const [c2, s2, td2] = [sqr(c), sqr(s), sqr(td)]
    const den = p.mp * s2 + p.mc
    const dx2dt = (p.mp * c * (p.l * td2 + p.g * c) - p.g * p.mp * s2) / den - (2 * p.mp * c * s * (f + p.mp * s * (p.l * td2 + p.g * c))) / sqr(den)
    const dx2dt1 = (2 * p.l * p.mp * td * s) / den
    const dt2dt = (f * s - p.g * c * (p.mc + p.mp) - p.l * p.mp * td2 * c2 + p.l * p.mp * td2 * s2) / (p.l * den) + (2 * p.mp * c * s * (p.l * p.mp * c * s * td2 + f * c + p.g * s * (p.mc + p.mp))) / (p.l * sqr(den))
    const dt2dt1 = -(2 * p.mp * td * c * s) / den
    return eig.Matrix.fromArray([
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, dx2dt, 0, dx2dt1],
      [0, dt2dt, 0, dt2dt1]
    ])
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    const p = this.params
    const [c, s] = [Math.cos(x.vGet(1)), Math.sin(x.vGet(1))]
    const s2 = sqr(s)
    const dx2du = 1 / (p.mp * s2 + p.mc)
    const dt2du = -c / (p.l * (p.mp * s2 + p.mc))
    return eig.Matrix.fromArray([
      [0], [0], [dx2du], [dt2du]
    ])
  }

  /**
   * Mouse step
   * @param {Array} mouseTarget 
   * @param {Number} dt 
   */
  trackMouse(mouseTarget, dt) {
    const { u } = this.trim()
    const dx = this.dynamics(this.x, u)
    // Control cart
    const xVel = 10 * (mouseTarget[0] - this.x.vGet(0));
    const thetaVel = 10 * wrapAngle(Math.PI - this.x.vGet(1));
    this.x.vSet(2, _.clamp(xVel, -15, 15))
    this.x.vSet(3, thetaVel);
    dx.vSet(0, this.x.vGet(2));
    dx.vSet(1, this.x.vGet(3));
    dx.vSet(2, 0);
    dx.vSet(3, 0);
    const newX = this.x.matAdd(dx.mul(dt));
    this.bound(newX);
    this.setState(newX);
    return { u }
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const COLOR = "#00897B";
    const COLOR_DARK = "#1565C0";
    const COLOR_RED = "#F44336";

    const GEOM = {
      thickness: 8,
      radius: 16,
      length: scale,
      cartWidth: 96, // TODO: base on scale?
      cartHeight: 48 // TODO: base on scale?
    };

    // Cart
    const cart = two.makeRectangle(0, 0, GEOM.cartWidth, GEOM.cartHeight);
    cart.fill = COLOR_DARK;
    cart.linewidth = 2;

    // Pole
    const shaft = two.makeRectangle(
      0,
      GEOM.length / 2,
      GEOM.thickness,
      GEOM.length + GEOM.thickness
    );
    shaft.fill = COLOR;
    shaft.linewidth = 2;
    const circle = two.makeCircle(0, GEOM.length, GEOM.radius);
    circle.fill = COLOR_DARK;
    circle.linewidth = 2;
    const pole = two.makeGroup(shaft, circle);

    // Forces
    const sides = [-GEOM.cartWidth / 2, GEOM.cartWidth / 2].map(x => {
      const fLine = two.makeLine(x, 0, x, 0);
      fLine.linewidth = 2;
      fLine.stroke = COLOR_RED;
      const fHead = two.makePolygon(0, 0, 6, 3);
      fHead.rotation = (Math.PI / 2) * Math.sign(x);
      fHead.fill = COLOR_RED;
      return { group: two.makeGroup(fLine, fHead), fLine, fHead };
    });
    const setControl = u => {
      sides.forEach((side, idx) => {
        const uh = _.clamp(u.vGet(0) * 5, -100, 100);
        side.group.visible = (idx - 0.5) * uh > 0;
        side.fHead.translation.x = (Math.sign(uh) * GEOM.cartWidth) / 2 + uh;
        side.fLine.vertices[1].x = side.fHead.translation.x;
      });
    };
    this.graphics = {
      setControl,
      cart: two.makeGroup(cart, pole, sides[0].group, sides[1].group),
      pole
    };
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    // TODO: draw torque
    const { u } = params;
    const x = this.x;
    this.graphics.pole.rotation = -x.vGet(1);
    this.graphics.cart.translation.set(...worldToCanvas([x.vGet(0), 0]));
    this.graphics.setControl(u);
  }

  /**
   * LQR Params
   */
  lqrParams() {
    return {
      Q: matFromDiag([10, 10, 1, 1]),
      R: matFromDiag([1]),
      simEps: 1e-1,
      simDuration: 5,
      disengage: false,
      divergenceThres: 500,
    }
  }

  /**
   * Direct collocation params
   */
  directCollocationParams() {
    return {
      nPts: 30,
      uBounds: { min: [-10], max: [10] },
      anchors: [{ t: 0, x: [0, 0, 0, 0] }, { t: 1, x: [0, 3.14, 0, 0] }],
      holdTime: 1,
      reverse: true
    }
  }
}

export default CartPole