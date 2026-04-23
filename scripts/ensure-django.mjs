#!/usr/bin/env node
/**
 * If Django is not listening on :8000, start it in the background (detached).
 * Used by `npm run dev:vite` so the Vite proxy to /api works without a second terminal.
 *
 * For combined logs (Django + Vite in one place), use: npm run dev
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
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }))
    })
    req.on('error', reject)
    req.setTimeout(2000, () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

async function apiReady() {
  try {
    const { status, body } = await httpGet(
      'http://127.0.0.1:8000/api/health/'
    )
    return status === 200 && body.includes('sms-api')
  } catch {
    return false
  }
}

async function waitForApi(maxMs = 40000) {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await apiReady()) return true
    await new Promise((r) => setTimeout(r, 350))
  }
  return false
}

async function main() {
  if (await apiReady()) {
    console.log('[sms] Django API already running → http://127.0.0.1:8000/api/health/')
    process.exit(0)
  }

  const py = pythonPath()
  if (!py) {
    console.error(
      '[sms] No Python venv in this project. Run:  bash scripts/setup-backend.sh'
    )
    process.exit(1)
  }

  console.log(
    '[sms] No API on :8000 — starting Django in the background…\n[sms] Tip: use `npm run dev` to see Django + Vite logs together.'
  )

  const backend = path.join(root, 'backend')
  const env = { ...process.env }

  await new Promise((resolve) => {
    const m = spawn(py, ['manage.py', 'migrate', '--noinput'], {
      cwd: backend,
      stdio: 'ignore',
      env,
    })
    m.on('close', resolve)
    m.on('error', resolve)
  })

  const child = spawn(py, ['manage.py', 'runserver', '127.0.0.1:8000'], {
    cwd: backend,
    detached: true,
    stdio: 'ignore',
    env,
  })
  child.unref()

  if (await waitForApi()) {
    console.log('[sms] Django is ready — Vite will proxy /api to :8000')
    process.exit(0)
  }

  console.error(
    '[sms] Django did not become ready in time.\n' +
      '     Run: npm run dev   or   bash scripts/run-backend.sh\n' +
      '     Then try: npm run dev:vite'
  )
  process.exit(1)
}

main()
