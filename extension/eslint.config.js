import rootConfig from '../eslint.config.js';

export default [
  { ignores: ['.wxt/**', '.output/**', 'dist/**'] },
  ...rootConfig,
];

