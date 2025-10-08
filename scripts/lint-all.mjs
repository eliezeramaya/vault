#!/usr/bin/env node
import { spawn } from 'node:child_process'

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
  p.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)))
})

async function main() {
  // Lint web (JS/JSX)
  await run('npm', ['run', 'lint'], { cwd: 'apps/web' })
}

main().catch(err => { console.error(err); process.exit(1) })
