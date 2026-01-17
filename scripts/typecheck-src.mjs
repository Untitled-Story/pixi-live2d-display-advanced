import { spawn } from 'node:child_process'

const tsc = spawn(
  'tsc',
  ['--noEmit', '-p', 'tsconfig.json', '--pretty', 'false', '--noErrorTruncation'],
  { stdio: ['ignore', 'pipe', 'pipe'] }
)

let buf = ''

const onData = (data) => {
  buf += data.toString()
  let lines = buf.split(/\r?\n/)
  buf = lines.pop()
  for (const line of lines) {
    if (line.startsWith('src/')) {
      process.stdout.write(line + '\n')
    }
  }
}

tsc.stdout.on('data', onData)
tsc.stderr.on('data', onData)

tsc.on('close', (code) => {
  if (code !== 0) {
    process.exit(1)
  }
})
