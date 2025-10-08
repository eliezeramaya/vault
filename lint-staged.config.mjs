export default {
  'apps/web/**/*.{js,jsx}': (files) => {
    const rel = files.map(f => f.replace(/^apps\\web\\/,'').replace(/^apps\/web\//,'')).join(' ')
    const abs = files.map(f => `"${f.replace(/\\/g,'/')}"`).join(' ')
    return [
      `prettier --write ${abs}`,
      `cd apps/web && npx eslint --max-warnings=0 --fix ${rel}`,
    ]
  },
  'apps/web/**/*.{ts,tsx,md,json,yml,yaml,css}': (files) => `prettier --write ${files.map(f => `"${f.replace(/\\/g,'/')}"`).join(' ')}`,
}
