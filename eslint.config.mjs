import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['cloudfunctions/**/*.js'],
    ignores: ['cloudfunctions/**/__tests__/**/*.js', 'cloudfunctions/__mocks__/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['cloudfunctions/**/__tests__/**/*.js', 'cloudfunctions/__mocks__/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  {
    files: ['jest.config.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: [
      'node_modules/',
      'miniprogram/node_modules/',
      'miniprogram/.miniprogram_npm/',
      'cloudfunctions/**/node_modules/',
      'backend/',
      'miniprogram/**/*.js',
      'miniprogram/**/*.ts',
      'coverage/',
      '*.json',
      '.prettierrc',
    ],
  },
];
