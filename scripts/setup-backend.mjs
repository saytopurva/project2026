#!/usr/bin/env node
/**
 * Cross-platform backend setup: venv, pip install, migrate, verify_database.
 * Mirrors scripts/setup-backend.sh without requiring bash.
 */
import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const backend = path.join(root, 'backend')
const reqFile = path.join(root, 'requirements.txt')

function venvPython() {
  const unix = path.join(root, 'venv', 'bin', 'python')
  const unix3 = path.join(root, 'venv', 'bin', 'python3')
  const win = path.join(root, 'venv', 'Scripts', 'python.exe')
  if (fs.existsSync(unix)) return unix
  if (fs.existsSync(unix3)) return unix3
  if (fs.existsSync(win)) return win
  return null
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    ...opts,
  })
  if (r.error) throw r.error
  if (r.status !== 0) process.exit(r.status ?? 1)
}

function createVenv() {
  const isWin = process.platform === 'win32'
  const candidates = isWin
    ? [
        ['py', ['-3', '-m', 'venv', 'venv']],
        ['python', ['-m', 'venv', 'venv']],
      ]
    : [
        ['python3', ['-m', 'venv', 'venv']],
        ['python', ['-m', 'venv', 'venv']],
      ]
  for (const [cmd, args] of candidates) {
    const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: process.env })
    if (!r.error && r.status === 0) return
  }
  console.error(
    '[sms] Could not create venv. Install Python 3 and ensure `python3` (or `py -3` on Windows) is on PATH.',
  )
  process.exit(1)
}

console.log(`[sms] Project root: ${root}`)

if (!fs.existsSync(path.join(root, 'venv'))) {
  console.log('[sms] Creating virtual environment (venv)…')
  createVenv()
}

const py = venvPython()
if (!py) {
  console.error('[sms] venv exists but Python executable not found.')
  process.exit(1)
}

if (!fs.existsSync(reqFile)) {
  console.error('[sms] Missing requirements.txt at', reqFile)
  process.exit(1)
}

console.log('[sms] Installing Python packages…')
run(py, ['-m', 'pip', 'install', '-q', '--upgrade', 'pip'])
run(py, ['-m', 'pip', 'install', '-q', '-r', reqFile])

console.log('[sms] Running migrations…')
run(py, ['manage.py', 'migrate', '--noinput'], { cwd: backend })

console.log('[sms] Verifying database…')
run(py, ['manage.py', 'verify_database'], { cwd: backend })

console.log('\n[sms] Backend setup complete.')
console.log('     Start stack:  npm run dev')
console.log('     Django only:  npm run dev:django')
