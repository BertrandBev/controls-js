module.exports = {
  "transpileDependencies": [
    "vuetify"
  ],
  chainWebpack: config => {
    config.resolve.symlinks(false);
    config.module
      //   .rule('wasm')
      //   .type('javascript/auto')
      //   .test(/\.wasm$/)
      //   .use('file-loader')
      //   .loader('file-loader')
      //   .options({
      //     publicPath: "dist/"
      //   })
      //   .end()
      // config.merge({
      //   node: { fs: 'empty' }
      // })

      .rule('wasm')
      .type('javascript/auto')
      .test(/\.wasm$/)
      // .use('wasm-loader')
      // .loader('wasm-loader')
      .use('arraybuffer-loader')
      .loader('arraybuffer-loader')
      .end()

    // .end()
  }
}