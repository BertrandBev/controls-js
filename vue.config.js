const path = require('path')

module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
    ? '/controls-js/'
    : '/',
  "transpileDependencies": [
    "vuetify"
  ],
  chainWebpack: config => {
    config.resolve.symlinks(false);
    config.module
      .rule('wasm')
      .type('javascript/auto')
      .test(/\.wasm$/)
      .use('arraybuffer-loader')
      .loader('arraybuffer-loader')
      .end()


    const svgRule = config.module.rule('svg');
    svgRule.uses.clear();
    svgRule
      .use('babel-loader')
      .loader('babel-loader')
      .end()
      .use('html-loader')
      .loader('html-loader');

    config.resolve.alias.set('@src', path.resolve(__dirname, 'src'))
    config.resolve.alias.set('@assets', path.resolve(__dirname, 'src/assets'))
    // Swap out with the below lines for local development
    config.resolve.alias.set('@eigen', 'eigen')
    config.resolve.alias.set('@nlopt', 'nlopt-js')
    // config.resolve.alias.set('@eigen', path.resolve(__dirname, '../eigen-js/dist/index.js'))
    // config.resolve.alias.set('@nlopt', path.resolve(__dirname, '../nlopt-js/dist/index.js'))
  }
}