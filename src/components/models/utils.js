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

export { createMarker, COLORS }