const { defineConfig } = require("@meteorjs/rspack");
const { federation } = require("./federation.config");

module.exports = defineConfig((Meteor) => ({
  module: {
    rules: [
      // Add support for importing SVGs as React components
      { test: /\.svg$/i, issuer: /\.[jt]sx?$/, use: ["@svgr/webpack"] },
    ],
  },
  plugins: Meteor.isClient ? federation(Meteor) : [],
  ...(Meteor.isClient && {
    // The host page fetches mf-manifest.json cross-origin in development.
    devServer: { headers: { "Access-Control-Allow-Origin": "*" } },
  }),
}));
