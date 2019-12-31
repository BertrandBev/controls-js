function wrapAngle(angle) {
  let mod = (angle + Math.PI) % (2 * Math.PI)
  if (mod < 0) { mod += 2 * Math.PI }
  return mod - Math.PI
}

function sqr(val) {
  return Math.pow(val, 2)
}

function matFromDiag(diag) {
  const n = diag.length
  const mat = [...Array(n)].map(() => [...Array(n)].map(() => 0))
  for (let k = 0; k < n; k++) {
    mat[k][k] = diag[k]
  }
  return mat
}

export { wrapAngle, sqr, matFromDiag }