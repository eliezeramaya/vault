#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
  p.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)))
})

async function main() {
  // Type-check web if tsconfig is present
  const webTsConfig = 'apps/web/tsconfig.json'
  if (existsSync(webTsConfig)) {
    await run('npx', ['tsc', '--noEmit'], { cwd: 'apps/web' })
  } else {
    console.log('apps/web: no tsconfig.json, skipping typecheck')
  }
}

main().catch(err => { console.error(err); process.exit(1) })
