// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',

  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: false,
            pure_funcs: [
              'console.log',
              'console.info',
              'console.warn',
              'console.debug',
              'console.trace'
            ]
          }
        },
        extractComments: false
      })
    ]
  }
};
