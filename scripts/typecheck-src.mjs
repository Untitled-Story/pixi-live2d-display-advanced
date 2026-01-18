import { spawn } from 'node:child_process'

const tsc = spawn(
  'tsc',
  ['--noEmit', '-p', 'tsconfig.json', '--pretty', 'false', '--noErrorTruncation'],
  { stdio: ['ignore', 'pipe', 'pipe'] }
)

let buf = ''
let hasError = false

const onData = (data) => {
  buf += data.toString()
  let lines = buf.split(/\r?\n/)
  buf = lines.pop()
  for (const line of lines) {
    if (line.startsWith('src/') || line.startsWith('src\\')) {
      process.stdout.write(line + '\n')

      if (!hasError) hasError = true
    }
  }
}

tsc.stdout.on('data', onData)
tsc.stderr.on('data', onData)

tsc.on('close', () => {
  process.exit(hasError ? 1 : 0)
})
