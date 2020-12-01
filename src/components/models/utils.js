const COLORS = {
}

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
    force.opacity = Math.abs(u) < 1e-3 ? 0 : 1;
    fHead.rotation = theta * Math.sign(u);
    fHead.translation.set(
      r * Math.cos(theta * Math.sign(u)),
      r * Math.sin(theta * Math.sign(u))
    );
  }
  setControl(0);
  return [force, setControl];
}

export { createMarker, createCircularForce, COLORS }