module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  settings: { react: { version: 'detect' } },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  plugins: ['react', 'react-hooks', '@typescript-eslint'],
  ignorePatterns: ['dist', 'build', 'node_modules'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: { project: false },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      files: ['**/*.js', '**/*.jsx'],
      rules: { 'no-undef': 'off' },
    },
    {
      files: ['**/*.{test,spec}.ts?(x)'],
      rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
    },
  ],
}
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  settings: { react: { version: 'detect' } },
  plugins: ['react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
  ],
  rules: {
    // React 17+ new JSX transform
    'react/react-in-jsx-scope': 'off',

    // Keep signal but avoid failing CI while migrating legacy code
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    'no-constant-condition': 'warn',
    'jsx-a11y/label-has-associated-control': 'warn',
    'react/prop-types': 'off',
  },
  ignorePatterns: [
    'dist/**',
    'build/**',
    'node_modules/**',
    // Legacy/prototype components kept for reference; excluded from lint
    'src/components/Pomodoro*.jsx',
    'src/components/PomodoroStats.jsx',
    'src/components/PomodoroAchievements.jsx',
    'src/components/PomodoroPanel*.jsx',
    'src/components/SphereMap.jsx',
  ],
};
