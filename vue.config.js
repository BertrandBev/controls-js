const path = require('path')

module.exports = {
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
    config.resolve.alias.set('@lib', path.resolve(__dirname, 'lib'))
    config.resolve.alias.set('@eigen', path.resolve(__dirname, 'lib/eigen-js/index.js'))
  }
}