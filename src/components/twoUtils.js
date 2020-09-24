
function setDraggable(shape, params = {}) {
  const el = shape._renderer.elem

  // el.style.cursor = 'move'
  el.addEventListener('mousemove', e => {
    shape.scale = params.scale || 1.5
    el.style.cursor = 'pointer'
  })
  el.addEventListener('mouseleave', e => {
    shape.scale = 1
  })
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    let anchor = [e.clientX, e.clientY];
    // Create functions
    function drag(e) {
      e.preventDefault();
      shape.translation.x += e.clientX - anchor[0]
      shape.translation.y += e.clientY - anchor[1]
      anchor = [e.clientX, e.clientY];
      shape.scale = params.scale || 1.5
      const pos = [shape.translation.x, shape.translation.y]
      if (params.mousemove) params.mousemove(pos);
    }
    function dragEnd(e) {
      e.preventDefault();
      window.removeEventListener('mousemove', drag)
      window.removeEventListener('mouseup', dragEnd);
      shape.scale = 1
      if (params.mouseup) params.mouseup();
    }
    window.addEventListener('mousemove', drag);
    window.addEventListener('mouseup', dragEnd);
    if (params.mousedown) params.mousedown();
  })
}

export { setDraggable }