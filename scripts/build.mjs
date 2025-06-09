import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { build } from 'vite'

const _dirname = dirname(fileURLToPath(import.meta.url))

const entries = [
  { entry: 'src/csm2.ts', name: 'cubism2' },
  { entry: 'src/csm4.ts', name: 'cubism4' },
  { entry: 'src/index.ts', name: 'index' },
  { entry: 'src/extra.ts', name: 'extra' }
]

const profiles = entries.flatMap(({ entry, name }) =>
  [false, true].map((minify) => ({
    build: {
      outDir: resolve(_dirname, '../dist'),
      emptyOutDir: false,
      minify: minify ? 'terser' : false,
      lib: {
        formats: minify ? ['umd'] : ['es', 'umd'],
        entry: resolve(_dirname, '..', entry),
        fileName: (format) =>
          `${name}${format === 'umd' ? (minify ? '.min' : '') : '.' + format}.js`
      }
    }
  }))
)

async function main() {
  for (const profile of profiles) {
    console.log(`\n🚀 Building: ${profile.build.lib.entry} → ${profile.build.outDir}`)
    console.log(`   Format: ${profile.build.lib.formats.join(', ')}`)
    console.log(`   Minify: ${!!profile.build.minify}\n`)

    await build(profile)
  }
}

await main()
