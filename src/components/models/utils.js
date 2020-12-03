const COLORS = {
};

function createMarker(two, radius, color, stroke = 0) {
  const marker = two.makeGroup();
  if (stroke > 0) {
    const circle = two.makeCircle(0, 0, radius);
    circle.stroke = color;
    circle.linewidth = stroke;
    marker.add(circle);
  }
  for (let k = 0; k < 4; k++) {
    const [sa, ea] = [k * Math.PI / 2, (k + 1) * Math.PI / 2];
    const segment = two.makeArcSegment(0, 0, 0, radius, sa, ea);
    segment.fill = k % 2 === 0 ? '#ffffff' : color;
    segment.noStroke();
    // segment.linewidth = 3;
    // segment.stroke = color;
    marker.add(segment);
  }
  return marker;
}

function createCircularForce(two, radius, color) {
  const theta = -5 * Math.PI / 4;
  const [sa, ea] = [Math.PI / 4, theta];
  const r = radius;
  const fArc = two.makeArcSegment(0, 0, r, r, sa, ea);
  fArc.stroke = color;
  fArc.linewidth = 2;
  fArc.noFill();
  const fHead = two.makePolygon(0, 0, 6, 3);
  fHead.fill = color;
  const force = two.makeGroup(fArc, fHead);
  const setControl = u => {
    force.visible = !!u;
    if (!u) return;
    const opacity = Math.min(Math.abs(u) / 10, 1);
    fArc.opacity = opacity;
    fHead.opacity = opacity;
    const headAngle = u < 0 ? sa : ea;
    fHead.rotation = headAngle + (u < 0 ? Math.PI : 0);
    fHead.translation.set(
      r * Math.cos(headAngle),
      r * Math.sin(headAngle)
    );
  };
  setControl(0);
  return { force, setControl };
}

function createTraj(two, nPts) {
  const traj = {};
  traj.data = [];
  traj.lines = [...Array(nPts)].map(() => {
    const line = two.makeLine(0, 0, 0, 0);
    return line;
  });
  traj.update = (transform) => {
    traj.data.forEach((x, idx) => {
      const xy = transform(x);
      traj.lines[idx].vertices[0].x = xy[0];
      traj.lines[idx].vertices[0].y = xy[1];
      traj.lines[idx].vertices[1].x = xy[0];
      traj.lines[idx].vertices[1].y = xy[1];
      if (idx > 0) {
        traj.lines[idx - 1].vertices[1].x = xy[0];
        traj.lines[idx - 1].vertices[1].y = xy[1];
      }
    });
  };
  return traj;
}

export { createMarker, createCircularForce, createTraj, COLORS };