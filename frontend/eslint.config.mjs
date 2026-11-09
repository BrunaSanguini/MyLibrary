// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const FEATURE_IMPORT = {
  group: ['@features/*'],
  message: 'Uma feature não importa outra. Mova o código comum para @shared ou @core.',
};

// Relative imports stay inside the component folder or one level up (a sibling in the same
// feature). Leaving that requires an alias, so the rules above also see relative paths.
const DEEP_RELATIVE_IMPORT = {
  group: ['../../*'],
  message: 'Para sair da pasta, use os aliases @core, @shared ou @features.',
};

export default defineConfig([
  {
    ignores: ['dist/', '.angular/', 'coverage/', 'src/app/core/api/schema.d.ts'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'ml', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'ml', style: 'camelCase' },
      ],
      // Folder boundaries (docs/arquitetura-front-end.md): features never import each other.
      'no-restricted-imports': ['error', { patterns: [FEATURE_IMPORT, DEEP_RELATIVE_IMPORT] }],
    },
  },
  {
    // shared/ui knows nothing about the application: no services, no API clients.
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            FEATURE_IMPORT,
            DEEP_RELATIVE_IMPORT,
            {
              group: ['@core/*'],
              message: 'shared/ui só recebe dados por input(); não use @core.',
            },
          ],
        },
      ],
    },
  },
  {
    // The route table is the only place that knows every feature.
    files: ['src/app/app.routes.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
]);
