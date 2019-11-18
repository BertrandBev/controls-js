const la = window.lalolib;
la.print = (mat, title='matrix') => {
  // if (mat instanceof la.Float64Array) {
  //   mat = la.array2mat(mat)
  // }
  console.log('# ' + title)
  for (let i = 0; i < mat.m; i++) {
    let row = `${i} - [`
    for (let j = 0; j < mat.n; j++) {
      row += `${mat.val[i * mat.n + j]}` + (j < mat.n - 1 ? ', ' : '')
    }
    row += ']'
    console.log(row)
  }
}

function test() {
  const A = la.array2mat([[1, 2], [1, 0]])
  const B = la.array2mat([1, 1.5])
  const Q = la.eye(2)
  const R = 2
  // console.log(A, B)
  // console.log(la.mul(A, B))
  lqr(A, B, Q, R)
}

function lqr(A, B, Q, R) {
  const Z11 = A
  const Z12 = la.mul(-1, la.mul(B, la.mul(la.inv(R), la.transpose(B))))
  const Z21 = la.mul(-1, Q)
  const Z22 = la.mul(-1, la.transpose(A))
  // la.print(Z11, 'Z11')
  // la.print(Z12, 'Z12')
  // la.print(Z21, 'Z21')
  // la.print(Z22, 'Z22')



  const Z = la.mat([la.mat([Z11, Z12]), la.mat([Z21, Z22])], true)
  la.print(Z, 'Z')
  const E = la.eigs(Z, true)
  console.log(E)
}

export default {
  test
}