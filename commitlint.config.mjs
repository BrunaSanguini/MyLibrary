// Conventional Commits with the types and scopes of CONTRIBUTING.md (same list as .github/workflows/pr-checks.yml).
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'books',
        'reading',
        'lists',
        'goals',
        'profile',
        'images',
        'openlibrary',
        'shelf',
        'backend',
        'frontend',
        'build',
        'ci',
        'deps',
        'adr',
      ],
    ],
  },
};
