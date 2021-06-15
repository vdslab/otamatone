module.exports = {
  webpack: {
    configure: (config) => {
      config.module.rules.push({
        test: /\.worker\.js$/,
        use: { loader: "file-loader" },
      });
      return config;
    },
  },
};
