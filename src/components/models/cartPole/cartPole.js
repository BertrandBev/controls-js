import eig from '@eigen';
import _ from 'lodash';
import { wrapAngle, sqr, matFromDiag } from '@/components/math.js';
import Model from '@/components/models/model.js';
import { createMarker, createTraj } from '../utils.js';
import colors from 'vuetify/lib/util/colors';
import { swingup, swingupMPC, topToTop } from './trajectory.js';

class CartPole extends Model {
  static NAME = 'cart pole';
  static TAG = 'cartPole';
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'theta', angle: true, min: -Math.PI, max: Math.PI, show: true },
    { name: 'xDot' },
    { name: 'thetaDot' }
  ]);
  static COMMANDS = Object.freeze([
    { name: 'force' }
  ]);

  constructor(params = {}) {
    super(CartPole.STATES, CartPole.COMMANDS, {
      ...params,
      g: 9.81,
      l: 1,
      mp: 0.2,
      mc: 1,
      mu: 0.5,
    });
  }

  trim() {
    return {
      x: new eig.Matrix([0, Math.PI, 0, 0]),
      u: new eig.Matrix([0])
    };
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    super.bound(x);
    x.set(1, wrapAngle(x.get(1)));
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [x, theta, dx, dtheta]
    const p = this.params;
    const [c, s] = [Math.cos(x.get(1)), Math.sin(x.get(1))];
    const dx = x.block(2, 0, 2, 1);
    const den = p.mc + p.mp * sqr(s);
    const ddx = new eig.Matrix([
      (u.get(0) + p.mp * s * (p.l * sqr(x.get(3)) + p.g * c)) / den, //- p.mu * x.get(2),
      -(u.get(0) * c + p.mp * p.l * sqr(x.get(3)) * c * s + (p.mp + p.mc) * p.g * s) / p.l / den //- p.mu * x.get(3)
    ]);
    return dx.vcat(ddx);
  }

  /**
   * Returns df/dx
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/dx
   */
  xJacobian(x, u) {
    const p = this.params;
    const td = x.get(3);
    const f = u.get(0);
    const [c, s] = [Math.cos(x.get(1)), Math.sin(x.get(1))];
    const [c2, s2, td2] = [sqr(c), sqr(s), sqr(td)];
    const den = p.mp * s2 + p.mc;
    const dx2dt = (p.mp * c * (p.l * td2 + p.g * c) - p.g * p.mp * s2) / den - (2 * p.mp * c * s * (f + p.mp * s * (p.l * td2 + p.g * c))) / sqr(den);
    const dx2dt1 = (2 * p.l * p.mp * td * s) / den;
    const dt2dt = (f * s - p.g * c * (p.mc + p.mp) - p.l * p.mp * td2 * c2 + p.l * p.mp * td2 * s2) / (p.l * den) + (2 * p.mp * c * s * (p.l * p.mp * c * s * td2 + f * c + p.g * s * (p.mc + p.mp))) / (p.l * sqr(den));
    const dt2dt1 = -(2 * p.mp * td * c * s) / den;
    return new eig.Matrix([
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, dx2dt, 0, dx2dt1],
      [0, dt2dt, 0, dt2dt1]
    ]);
  }

  /**
   * Returns df/du
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} df/du
   */
  uJacobian(x, u) {
    const p = this.params;
    const [c, s] = [Math.cos(x.get(1)), Math.sin(x.get(1))];
    const s2 = sqr(s);
    const dx2du = 1 / (p.mp * s2 + p.mc);
    const dt2du = -c / (p.l * (p.mp * s2 + p.mc));
    return new eig.Matrix([
      [0], [0], [dx2du], [dt2du]
    ]);
  }

  /**
   * Mouse step
   * @param {Array} mouseTarget 
   * @param {Number} dt 
   */
  trackMouse(mouseTarget, dt) {
    const { u } = this.trim();
    const dx = this.dynamics(this.x, u);
    // Control cart
    const xVel = 10 * (mouseTarget[0] - this.x.get(0));
    const thetaVel = 10 * wrapAngle(Math.PI - this.x.get(1));
    this.x.set(2, _.clamp(xVel, -15, 15));
    this.x.set(3, thetaVel);
    dx.set(0, this.x.get(2));
    dx.set(1, this.x.get(3));
    dx.set(2, 0);
    dx.set(3, 0);
    const newX = this.x.matAdd(dx.mul(dt));
    this.bound(newX);
    this.setState(newX);
    return { u };
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
      radius: 14,
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

    // Marker
    const marker = createMarker(two, 2 * GEOM.radius / 3, colors.indigo.darken4, 5);

    // Forces
    const sides = [-GEOM.cartWidth / 2, GEOM.cartWidth / 2].map(x => {
      const fLine = two.makeLine(x, 0, x, 0);
      fLine.linewidth = 2;
      fLine.stroke = COLOR_RED;
      const fHead = two.makePolygon(0, 0, 6, 3);
      fHead.rotation = (Math.PI / 2) * Math.sign(x);
      fHead.fill = COLOR_RED;
      const group = two.makeGroup(fLine, fHead);
      group.visible = false;
      return { group, fLine, fHead };
    });
    const setControl = u => {
      if (u)
        sides.forEach((side, idx) => {
          const uh = _.clamp(u.get(0) * 5, -100, 100);
          side.group.visible = (idx - 0.5) * uh > 1e-2;
          side.fHead.translation.x = (Math.sign(uh) * GEOM.cartWidth) / 2 + uh;
          side.fLine.vertices[1].x = side.fHead.translation.x;
        });
    };
    this.graphics = {
      setControl,
      cart: two.makeGroup(cart, pole, marker, sides[0].group, sides[1].group),
      pole
    };
    // Create traj
    this.graphics.scale = GEOM.length;
    this.graphics.traj = createTraj(two, this.mpcParams().nPts);
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    // TODO: draw torque
    const { u, ghost } = params;
    const x = this.x;
    this.graphics.cart.opacity = ghost ? 0.3 : 1;
    this.graphics.pole.rotation = -x.get(1);
    this.graphics.cart.translation.set(...worldToCanvas([x.get(0), 0]));
    this.graphics.setControl(u);
    this.graphics.traj.update((pt) => {
      const center = worldToCanvas([pt.get(0), 0]);
      return [
        center[0] + this.graphics.scale * Math.sin(pt.get(1)),
        center[1] + this.graphics.scale * Math.cos(pt.get(1))
      ];
    });
  }

  /**
   * LQR Params
   */
  lqrParams() {
    return {
      x0: [-2, Math.PI, 0, 0],
      Q: matFromDiag([10, 10, 1, 1]),
      R: matFromDiag([1]),
      simEps: 1e-1,
      simDuration: 5,
      disengage: false,
      divergenceThres: 500,
    };
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
      // reverse: true,
      traj: swingup,
    };
  }

  /**
   * MPC Params
   */
  mpcParams() {
    return {
      nPts: 20,
      uBounds: { min: [-10], max: [10] },
      dt: 1 / 10,
      traj: swingupMPC,
      // traj: topToTop,
      xWeight: [100, 100, 0.1, 0.1],
    };
  }
}

export default CartPole;