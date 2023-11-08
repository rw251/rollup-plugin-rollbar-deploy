module.exports = {
  transform: {
    '\\.js$': ['babel-jest', { configFile: './.commonjs.babelrc' }],
  },
};
