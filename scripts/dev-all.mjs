#!/usr/bin/env node
/**
 * Cross-platform `npm run dev`: Django :8000 + Vite :3000 in one Node parent.
 * No bash required. If :8000 already serves this API, only Vite is started.
 */
import { spawn } from 'child_process'
import fs from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function pythonPath() {
  const candidates = [
    path.join(root, 'venv', 'bin', 'python'),
    path.join(root, 'venv', 'bin', 'python3'),
    path.join(root, 'venv', 'Scripts', 'python.exe'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () =>
        resolve({ status: res.statusCode ?? 0, body: data }),
      )
    })
    req.on('error', () => resolve({ status: 0, body: '' }))
    req.setTimeout(2000, () => {
      req.destroy()
      resolve({ status: 0, body: '' })
    })
  })
}

async function apiReady() {
  const { status, body } = await httpGet('http://127.0.0.1:8000/api/health/')
  return status === 200 && body.includes('sms-api')
}

async function waitForApi(maxMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await apiReady()) return true
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

const py = pythonPath()
if (!py) {
  console.error(
    '[sms] No Python venv found. Run:  npm run setup:backend   (or  bash scripts/setup-backend.sh)',
  )
  process.exit(1)
}

const backend = path.join(root, 'backend')
const env = { ...process.env }

if (process.env.SMS_DEV_AUTO_FREE !== '0' && process.platform !== 'win32') {
  const freeScript = path.join(root, 'scripts', 'free-dev-ports.sh')
  if (fs.existsSync(freeScript)) {
    await new Promise((resolve) => {
      const p = spawn('bash', [freeScript, '--quiet'], {
        cwd: root,
        stdio: 'ignore',
        env,
      })
      p.on('close', resolve)
      p.on('error', resolve)
    })
  }
}

/** @type {import('child_process').ChildProcess | null} */
let django = null
/** @type {import('child_process').ChildProcess | null} */
let viteProc = null

function killDjango() {
  if (!django || django.exitCode !== null || django.killed) return
  django.kill('SIGTERM')
}

if (await apiReady()) {
  console.log(
    '[sms] Django API already running — http://127.0.0.1:8000/api/health/',
  )
} else {
  console.log('[sms] Migrating database…')
  const migCode = await new Promise((resolve) => {
    const m = spawn(py, ['manage.py', 'migrate', '--noinput'], {
      cwd: backend,
      stdio: 'inherit',
      env,
    })
    m.on('close', (code) => resolve(code ?? 1))
    m.on('error', (err) => {
      console.error('[sms]', err.message)
      resolve(1)
    })
  })
  if (migCode !== 0) {
    console.error('[sms] migrate failed — fix errors above.')
    process.exit(1)
  }

  console.log('[sms] Starting Django at http://127.0.0.1:8000 …')

  django = spawn(py, ['manage.py', 'runserver', '127.0.0.1:8000'], {
    cwd: backend,
    stdio: 'inherit',
    env,
  })

  django.on('error', (err) => {
    console.error('[sms] Failed to start Django:', err.message)
    process.exit(1)
  })

  django.on('exit', (code) => {
    if (viteProc) {
      if (!viteProc.killed) viteProc.kill('SIGTERM')
      return
    }
    if (code !== 0 && code !== null) {
      console.error(
        '[sms] Django exited before the API was ready. Is port 8000 in use? Try: npm run dev:free',
      )
    }
    process.exit(code ?? 1)
  })

  await new Promise((r) => setTimeout(r, 400))

  if (!(await waitForApi())) {
    console.error(
      '[sms] Django did not become ready in time. Port 8000 busy? Try: npm run dev:free',
    )
    killDjango()
    process.exit(1)
  }
}

const viteJs = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')
if (!fs.existsSync(viteJs)) {
  console.error('[sms] Vite not installed. Run: npm install')
  killDjango()
  process.exit(1)
}

console.log(
  '[sms] Starting Vite — http://127.0.0.1:3000  (proxy /api → http://127.0.0.1:8000)',
)

viteProc = spawn(process.execPath, [viteJs], {
  cwd: root,
  stdio: 'inherit',
  env,
})

function shutdownFromSignal(sig) {
  const code = sig === 'SIGINT' ? 130 : 143
  if (viteProc && !viteProc.killed) {
    viteProc.kill(sig)
    return
  }
  killDjango()
  process.exit(code)
}

process.on('SIGINT', () => shutdownFromSignal('SIGINT'))
process.on('SIGTERM', () => shutdownFromSignal('SIGTERM'))

viteProc.on('exit', (code) => {
  killDjango()
  process.exit(code ?? 0)
})

viteProc.on('error', (err) => {
  console.error('[sms] Failed to start Vite:', err.message)
  killDjango()
  process.exit(1)
})
