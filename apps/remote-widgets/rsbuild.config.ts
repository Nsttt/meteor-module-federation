import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import moduleFederationConfig from './module-federation.config';

export default defineConfig({
  plugins: [pluginReact(), pluginModuleFederation(moduleFederationConfig)],
  server: {
    port: 3030,
    // The Meteor host lives on another origin.
    cors: true,
  },
  output: {
    // Chunks must load from this server, not from the host's origin.
    assetPrefix: 'http://localhost:3030/',
  },
  dev: {
    assetPrefix: 'http://localhost:3030/',
  },
});
