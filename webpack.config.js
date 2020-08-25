module.exports = [{
  mode: process.env.NODE_ENV || 'development',
  devtool: false,
  entry: './app/index.tsx',
  resolve: { extensions: ['.js', '.tsx'] },
  output: {
    path: `${__dirname}/public`,
    filename: 'bundle.js'
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-typescript', ['@babel/env', { targets: { node: 'current' } }], '@babel/react'],
          plugins: ['@babel/plugin-proposal-optional-chaining', '@babel/proposal-object-rest-spread']
        }
      }
    }, {
      test: /\.scss$/,
      use: ['style-loader', 'css-loader?url=false', 'sass-loader']
    }]
  }
}]
