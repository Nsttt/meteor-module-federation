import { createModuleFederationConfig } from '@module-federation/rsbuild-plugin';

// A plain Rsbuild remote. Nothing here knows about Meteor: the host hands
// live Meteor data down as props, and React comes from the host's share scope.
export default createModuleFederationConfig({
  name: 'remote_widgets',
  exposes: {
    './TaskStats': './src/widgets/TaskStats.tsx',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
  },
});
