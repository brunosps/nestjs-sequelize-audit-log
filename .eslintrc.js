module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier', // Certifique-se de que prettier seja o último para sobrescrever outras configs de formatação
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
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'no-constant-condition': 'warn', // Alterado para warning
    'no-prototype-builtins': 'warn', // Alterado para warning
    '@typescript-eslint/ban-types': [ // Configuração mais granular para ban-types
      'warn', // Alterado para warning
      {
        types: {
          Function: {
            message:
              "Don't use `Function` as a type. The `Function` type accepts any function-like value. It provides no type safety when calling the function, which can be a common source of bugs. It also accepts things like class declarations, which will throw at runtime as they will not be called with `new`. If you are expecting the function to accept certain arguments, you should explicitly define the function shape.",
            fixWith: '(...args: any[]) => any', // Sugestão de correção
          },
          // Você pode adicionar outras configurações de ban-types aqui se necessário
          // '{}': false, // Exemplo para permitir {} se você precisar
        },
        extendDefaults: true,
      },
    ],
    'no-inner-declarations': ['warn', 'functions'], // Alterado para warning, apenas para funções
    // Adicione ou sobrescreva regras conforme necessário
  },
};
