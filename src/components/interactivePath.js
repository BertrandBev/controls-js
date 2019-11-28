import Two from "two.js";
import _ from 'lodash'
import Vue from 'vue'

// TODO: allow for open path (and non differentiable ?)
class InteractivePath {
  constructor(two) {
    this.updateListeners = []

    const length = 200
    const vHandle = 60
    const dHandle = 100

    this.path = new Two.Path([
      // new Two.Anchor(0, 0),
      new Two.Anchor(-length, 0, 0, vHandle, 0, -vHandle, Two.Commands.curve),
      new Two.Anchor(0, 0, -dHandle, -dHandle, dHandle, dHandle, Two.Commands.curve),
      new Two.Anchor(length, 0, 0, vHandle, 0, -vHandle, Two.Commands.curve),
      new Two.Anchor(0, 0, dHandle, -dHandle, -dHandle, dHandle, Two.Commands.curve),
      new Two.Anchor(-length, 0, 0, vHandle, 0, -vHandle, Two.Commands.curve)
    ], false)
    this.path.automatic = false;
    this.path.noFill()
    this.path.stroke = '#9C27B0'
    this.path.linewidth = 3
    this.group = two.makeGroup(this.path)

    const vertices = this.path.vertices
    for (let k = 1; k < vertices.length; k++) {
      const anchor = vertices[k]

      const radius = 20;
      const editColor = '#00897B'


      const handle = two.makeCircle(0, 0, radius / 4);
      const l = two.makeCircle(0, 0, radius / 4);
      // var r = two.makeCircle(0, 0, radius / 4);

      handle.translation.copy(anchor);
      l.translation.copy(anchor.controls.left).addSelf(anchor);
      // r.translation.copy(anchor.controls.right).addSelf(anchor);
      handle.noStroke().fill = l.noStroke().fill = editColor;
      // r.noStroke().fill 

      const ll = new Two.Path([
        new Two.Anchor().copy(handle.translation),
        new Two.Anchor().copy(l.translation)
      ]);
      // var rl = new Two.Path([
      //   new Two.Anchor().copy(handle.translation),
      //   new Two.Anchor().copy(r.translation)
      // ]);
      ll.noFill().stroke = editColor;
      // rl.noFill().stroke = editColor;

      this.group.add(ll, handle, l);

      const _this = this
      handle.translation.bind(Two.Events.change, function () {
        anchor.copy(this);
        l.translation.copy(anchor.controls.left).addSelf(this);
        ll.vertices[0].copy(this);
        ll.vertices[1].copy(l.translation);
        if (k === vertices.length - 1) {
          vertices[0].copy(this)
        }
        _this.onUpdate()
        // r.translation.copy(anchor.controls.right).addSelf(this);
        // rl.vertices[0].copy(this);
        // rl.vertices[1].copy(r.translation);
      });
      l.translation.bind(Two.Events.change, function () {
        anchor.controls.left.copy(this).subSelf(anchor);
        let controls = k === vertices.length - 1 ? vertices[0].controls.right : anchor.controls.right;
        controls.copy(this).subSelf(anchor).multiplyScalar(-1);
        ll.vertices[1].copy(this);
        _this.onUpdate()
      });
      // r.translation.bind(Two.Events.change, function () {
      //   anchor.controls.right.copy(this).subSelf(anchor);
      //   anchor.controls.left.copy(this).subSelf(anchor).multiplyScalar(-1);
      //   rl.vertices[1].copy(this);
      // });

      // Add Interactivity
      this.addInteractivity(handle);
      this.addInteractivity(l);
      // addInteractivity(r);
    }
    two.update();
  }

  addInteractivity(shape) {
    Vue.nextTick(() => {
      const el = shape._renderer.elem
      // el.style.cursor = 'move'
      el.addEventListener('mousemove', e => {
        shape.scale = 2
      })
      el.addEventListener('mouseleave', e => {
        shape.scale = 1
      })
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        let anchor = [e.clientX, e.clientY];
        // Create funcitons
        function drag(e) {
          e.preventDefault();
          shape.translation.x += e.clientX - anchor[0]
          shape.translation.y += e.clientY - anchor[1]
          anchor = [e.clientX, e.clientY];
          shape.scale = 2
        }
        function dragEnd(e) {
          e.preventDefault();
          window.removeEventListener('mousemove', drag)
          window.removeEventListener('mouseup', dragEnd);
          shape.scale = 1
        }
        window.addEventListener('mousemove', drag);
        window.addEventListener('mouseup', dragEnd);
      })
    })
  }

  addUpdateListener(listener) {
    this.updateListeners.push(listener)
  }

  onUpdate() {
    this.updateListeners.forEach(l => l())
  }

  discretize(nPoints) {
    const traj = []
    for (let k = 0; k < nPoints; k++) {
      const t = k / nPoints;
      traj.push(this.path.getPointAt(t))
    }
    return traj
  }
}

export { InteractivePath }