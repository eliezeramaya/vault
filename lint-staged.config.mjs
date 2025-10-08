import path from 'node:path'

export default {
  'apps/web/**/*.{js,jsx}': (files) => {
    const abs = files.map(f => `"${f.replace(/\\/g,'/')}"`).join(' ')
    // Compute relative paths from apps/web for eslint
    const relList = files
      .map(f => path.relative(path.join(process.cwd(), 'apps/web'), f))
      .map(f => f.replace(/\\/g,'/'))
      .filter(f => !f.startsWith('..'))
    const rel = relList.map(f => `"${f}"`).join(' ')
    const eslintBin = 'node apps/web/node_modules/eslint/bin/eslint.js'
  const eslintArgs = rel ? `${eslintBin} --fix --config apps/web/.eslintrc.cjs --resolve-plugins-relative-to apps/web ${abs}` : ''
    return [
      `prettier --write ${abs}`,
      rel ? eslintArgs : 'echo "no web files to lint"',
    ]
  },
  'apps/web/**/*.{ts,tsx,md,json,yml,yaml,css}': (files) => `prettier --write ${files.map(f => `"${f.replace(/\\/g,'/')}"`).join(' ')}`,
}
