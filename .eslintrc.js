module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'simple-import-sort', 'unused-imports', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'prettier/prettier': ['error', { endOfLine: 'auto' }],

    // Regras para imports
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          ['^node:'],
          ['^@?\\w'],
          ['^(@|components|utils|config|hooks|pages|styles)(/.*|$)'],
          ['^\\u0000'],
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
          ['^.+\\.?(css)$'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
    'import/first': 'off',
    'import/newline-after-import': 'off',
    'import/no-duplicates': 'off',

    // Regras para imports não utilizados
    'unused-imports/no-unused-imports': 'error',
    'unused-imports/no-unused-vars': [
      'warn',
      {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-unused-vars': 'off',

    // Regras para comentários
    'spaced-comment': [
      'error',
      'always',
      {
        line: {
          markers: ['/'],
          exceptions: ['-', '+'],
        },
        block: {
          markers: ['!'],
          exceptions: ['*'],
          balanced: true,
        },
      },
    ],

    // Proibir tipos específicos de comentários
    'no-inline-comments': 'error', // Remove comentários inline
    'line-comment-position': ['error', { position: 'above' }], // Força comentários acima da linha

    // Regra customizada para remover comentários TODO/FIXME (opcional)
    'no-warning-comments': [
      'warn',
      {
        terms: ['todo', 'fixme', 'hack', 'review', 'xxx'],
        location: 'anywhere',
      },
    ],

    // Outras regras existentes
    'no-constant-condition': 'warn',
    'no-prototype-builtins': 'warn',
    '@typescript-eslint/ban-types': [
      'warn',
      {
        types: {
          Function: {
            message: "Don't use `Function` as a type. Use a more specific function type instead.",
            fixWith: '(...args: any[]) => any',
          },
        },
        extendDefaults: true,
      },
    ],
    'no-inner-declarations': ['warn', 'functions'],
  },
};
