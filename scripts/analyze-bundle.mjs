#!/usr/bin/env node
import { spawn } from 'node:child_process'

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
  p.on('exit', code => code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited ${code}`)))
})

async function main() {
  // Build web app with stats and print output size summary (vite already reports sizes)
  await run('npm', ['run', 'build'], { cwd: 'apps/web' })
}

main().catch(err => { console.error(err); process.exit(1) })
