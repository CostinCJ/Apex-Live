module.exports = function (api) {
  api.cache(true);

  const plugins = [];

  // Strip console.log/warn/error in production builds
  if (process.env.NODE_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
