import eig from '@eigen';
import _ from 'lodash';
import chroma from 'chroma-js';
import colors from 'vuetify/lib/util/colors';
import Model from '@/components/models/model.js';
import { wrapAngle, sqr, matFromDiag, smooth, differenciate } from '@/components/math.js';
import { flipTraj, flipTrajMPC } from './trajectories.js';
import { createMarker, createTraj } from '../utils.js';

class Quadrotor2D extends Model {
  static NAME = 'quadrotor';
  static TAG = 'quadrotor2D';
  static STATES = Object.freeze([
    { name: 'x', show: true },
    { name: 'y', show: true },
    { name: 'theta', show: true },
    { name: 'yDot', derivative: true },
    { name: 'xDot', derivative: true },
    { name: 'thetaDot', derivative: true },
  ]);
  static COMMANDS = Object.freeze([
    { name: 't1' },
    { name: 't2' }
  ]);

  constructor(params = {}) {
    super(Quadrotor2D.STATES, Quadrotor2D.COMMANDS, {
      g: 9.81,
      l: 1,
      m: 1,
      I: 1,
      // mu: 0.5, TODO: add natural damping
      ...params
    });
  }

  trim() {
    const u0 = this.params.g * this.params.m / 2;
    return { x: new eig.Matrix(6, 1), u: new eig.Matrix([u0, u0]) };
  }

  /**
   * Bound state x to appropriate domain
   * @param {Matrix} x 
   */
  bound(x) {
    x.set(2, wrapAngle(x.get(2)));
  }

  /**
   * Returns dx/dt
   * @param {Matrix} x
   * @param {Matrix} u
   * @returns {Matrix} dx
   */
  dynamics(x, u) {
    // x = [x, y, theta, dx, dy, dtheta]
    const p = this.params;
    const [c, s] = [Math.cos(x.get(2)), Math.sin(x.get(2))];
    const [u1, u2] = [u.get(0), u.get(1)];
    const ddx = new eig.Matrix([
      -(u1 + u2) * s / p.m,
      (u1 + u2) * c / p.m - p.g,
      p.l / 2 * (u1 - u2) / p.I
    ]);
    const dx = x.block(3, 0, 3, 1);
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
    const [c, s] = [Math.cos(x.get(2)), Math.sin(x.get(2))];
    const [u1, u2] = [u.get(0), u.get(1)];
    const dx2dt = -(u1 + u2) * c / p.m;
    const dy2dt = -(u1 + u2) * s / p.m;
    return new eig.Matrix([
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1],
      [0, 0, dx2dt, 0, 0, 0],
      [0, 0, dy2dt, 0, 0, 0],
      [0, 0, 0, 0, 0, 0]
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
    const [c, s] = [Math.cos(x.get(2)), Math.sin(x.get(2))];
    const dx2du1 = -s / p.m;
    const dy2du1 = c / p.m;
    const dt2du1 = p.l / 2 / p.I;
    return new eig.Matrix([
      [0, 0], [0, 0], [0, 0], [dx2du1, dx2du1], [dy2du1, dy2du1], [dt2du1, -dt2du1]
    ]);
  }

  /**
   * Mouse step
   * @param {Number} dt 
   * @param {Array} mouseTarget 
   */
  trackMouse(mouseTarget, dt) {
    const { u } = this.trim();
    u.mulSelf(0);
    const dxo = new eig.Matrix([
      mouseTarget[0] - this.x.get(0),
      mouseTarget[1] - this.x.get(1),
      -this.x.get(2)
    ]).mul(10).clamp(-10, 10);
    const dx = dxo.vcat(new eig.Matrix(3, 1));
    this.x.setBlock(3, 0, dxo.block(0, 0, 3, 1));
    // TODO: extract in schema
    const newX = this.x.matAdd(dx.mul(dt));
    this.bound(newX);
    this.setState(newX);
    return { u };
  }

  /**
   * Draw model
   */
  createGraphics(two, scale) {
    const GEOM = {
      thickness: 8,
      length: scale,
      mr: scale / 10
    };

    const body = two.makeRectangle(0, 0, GEOM.length, GEOM.thickness);
    body.fill = colors.blue.base;
    body.linewidth = 2;

    // Create propellers
    const propHeight = -1.5 * GEOM.thickness;
    const propLength = GEOM.length / 4;
    this.graphics.force = [null, null];
    const sides = [(3 * GEOM.length) / 7, (-3 * GEOM.length) / 7].map(x => {
      const prop = two.makeLine(
        x - propLength,
        propHeight,
        x + propLength,
        propHeight
      );
      prop.linewidth = 3;
      prop.fill = colors.green.base;
      const shaft = two.makeLine(x, -3, x, propHeight);
      shaft.linewidth = 2;
      shaft.fill = colors.green.base;
      // Motors?

      // Forces
      const fLine = two.makeLine(x, propHeight, x, propHeight - 10);
      fLine.linewidth = 2;
      fLine.stroke = colors.red.base;
      const fHead = two.makePolygon(x, propHeight - 10, 6, 3);
      fHead.fill = colors.red.base;

      return {
        prop: two.makeGroup(prop, shaft, fLine, fHead),
        fLine,
        fHead
      };
    });
    this.graphics.setControl = u => {
      sides.forEach((side, idx) => {
        side.fHead.visible = side.fLine.visible = !!u;
        if (!u) return;
        const uh = _.clamp(u.get(idx) * 5, -100, 100);
        side.fHead.translation.y = propHeight - uh;
        side.fHead.rotation = uh > 0 ? 0 : Math.PI;
        side.fLine.vertices[1].y = side.fHead.translation.y;
      });
    };

    this.graphics.system = two.makeGroup(
      body,
      sides[0].prop,
      sides[1].prop
    );

    // Create marker
    const marker = createMarker(two, GEOM.mr, colors.blue.darken4, 4);
    this.graphics.system.add(marker);

    // Create traj
    this.graphics.traj = createTraj(two, this.mpcParams().nPts);
  }

  /**
   * Update model
   */
  updateGraphics(worldToCanvas, params) {
    const { u } = params;
    const x = this.x;
    this.graphics.system.translation.set(...worldToCanvas([x.get(0), x.get(1)]));
    this.graphics.system.rotation = -x.get(2);
    this.graphics.setControl(u);
    this.graphics.system.opacity = params.ghost ? 0.3 : 1;
    this.graphics.traj.update((pt) => {
      return worldToCanvas([pt.get(0), pt.get(1)]);
    });
  }

  /**
   * Differential flatness solution for an x, y trajectory
   * @returns [x; u]
   */
  differentialFlatness(xy, dt) {
    const p = this.params;
    // Differenciate trajectory
    xy = smooth(xy, dt, 1);
    const dxy = differenciate(xy, dt, 1, true);
    const ddxy = differenciate(dxy, dt, 1, true);
    const theta = ddxy.map(val => {
      const t = Math.atan(-val.get(0) / (val.get(1) + p.g));
      return new eig.Matrix([t]);
    });
    const dtheta = differenciate(theta, dt, 1, true);
    const ddtheta = differenciate(dtheta, dt, 1, true);
    return xy.map((val, idx) => {
      // compute u
      const a = p.m * Math.sqrt(sqr(ddxy[idx].get(0)) + sqr(ddxy[idx].get(1) + p.g)) / 2;
      const b = p.I * ddtheta[idx].get(0) / p.l;
      const u = new eig.Matrix([a + b, a - b]);
      return val.vcat(theta[idx]).vcat(dxy[idx]).vcat(dtheta[idx]).vcat(u);
    });
  }


  /**
   * LQR Params
   */
  lqrParams() {
    return {
      Q: matFromDiag([10, 10, 10, 1, 1, 1]),
      R: matFromDiag([1, 1]),
      simEps: 0.1,
      simDuration: 5,
      disengage: false,
      divergenceThres: 100,
    };
  }

  /**
   * Direct collocation params
   */
  directCollocationParams() {
    // return {
    //   nPts: 20,
    //   uBounds: { min: [0, 0], max: [20, 20] },
    //   anchors: [{ t: 0, x: [0, 0, 0, 0, 0, 0] }, { t: 1, x: [0, 1, 0, 0, 0, 0] }],
    //   holdTime: 0,
    //   reverse: true
    // }
    return {
      nPts: 20,
      uBounds: { min: [0, 0], max: [20, 20] },
      anchors: [{ t: 0, x: [-2, 0, 0, 0, 0, 0] }, { t: 1, x: [2, 0, -6.28, 0, 0, 0] }],
      holdTime: 0,
      reverse: true,
      traj: flipTraj
    };
  }

  /**
   * MPC Params
   */
  mpcParams() {
    return {
      nPts: 10,
      uBounds: { min: [-10, -10], max: [25, 25] },
      dt: 1 / 10, // 1 / 60,
      traj: flipTrajMPC
    };
  }
}

export default Quadrotor2D;