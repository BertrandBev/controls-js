function wrapAngle(angle) {
  let mod = (angle + Math.PI) % (2 * Math.PI)
  if (mod < 0) { mod += 2 * Math.PI }
  return mod - Math.PI
}

function sqr(val) {
  return Math.pow(val, 2)
}

export { wrapAngle, sqr }