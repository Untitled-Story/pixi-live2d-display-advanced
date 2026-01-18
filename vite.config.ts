import { existsSync, readFileSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { defineConfig } from 'vite'
import packageJson from './package.json'

const cubismSubmodule = path.resolve(__dirname, 'cubism')
const cubism2Core = path.resolve(__dirname, 'core/live2d.min.js')
const cubism4Core = path.resolve(__dirname, 'core/live2dcubismcore.js')
const require = createRequire(path.resolve(__dirname, 'package.json'))
const pixiPackageRoot = (() => {
  try {
    return path.dirname(require.resolve('pixi.js/package.json'))
  } catch {
    return null
  }
})()
const packageNamespaceCache = new Map<string, string | null>()

function getPackageName(id: string) {
  if (id.startsWith('@')) {
    const [scope, name] = id.split('/')
    if (name) {
      return `${scope}/${name}`
    }
  }

  return id.split('/')[0]
}

function resolvePackageJsonPath(packageName: string) {
  const specifier = `${packageName}/package.json`

  if (pixiPackageRoot) {
    try {
      return require.resolve(specifier, { paths: [pixiPackageRoot] })
    } catch {
      // Fall back to default resolution.
    }
  }

  try {
    return require.resolve(specifier)
  } catch {
    return null
  }
}

function getPackageNamespace(packageName: string) {
  if (packageNamespaceCache.has(packageName)) {
    return packageNamespaceCache.get(packageName)
  }

  const packageJsonPath = resolvePackageJsonPath(packageName)
  if (!packageJsonPath) {
    packageNamespaceCache.set(packageName, null)
    return null
  }

  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
      namespace?: string
    }
    const namespace = packageJson.namespace || 'PIXI'
    packageNamespaceCache.set(packageName, namespace)
    return namespace
  } catch {
    packageNamespaceCache.set(packageName, null)
    return null
  }
}

if (!existsSync(cubismSubmodule) || !existsSync(path.resolve(cubismSubmodule, 'package.json'))) {
  throw new Error(
    'Cubism submodule not found. Please run `git submodule update --init` to download them. If you have trouble downloading the submodule, please check out DEVELOPMENT.md for possible solutions.'
  )
}

if (!existsSync(cubism2Core) || !existsSync(cubism4Core)) {
  throw new Error('Cubism Core not found. Please run `npm run setup` to download them.')
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  // noinspection JSUnusedLocalSymbols,JSUnusedGlobalSymbols
  return {
    define: {
      __DEV__: isDev,
      __VERSION__: JSON.stringify(packageJson.version),

      // test env
      __HEADLESS__: process.env.CI === 'true'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@cubism': path.resolve(__dirname, 'cubism/src')
      }
    },
    server: {
      open: isDev ? '/playground/index.html' : false,
      proxy: {
        '/model': {
          target: 'http://localhost:8000',
          changeOrigin: true
        },
        '/minio': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    },
    build: {
      target: 'es6',
      lib: {
        entry: '',
        name: 'PIXI.live2d'
      },
      rollupOptions: {
        external: (id, _parentId, _isResolved) => {
          const packageName = getPackageName(id)
          if (packageName === 'pixi.js') {
            return true
          }

          return packageName?.startsWith('@pixi/')
        },
        output: {
          extend: true,
          globals(id: string) {
            const packageName = getPackageName(id)
            if (packageName === 'pixi.js') {
              return 'PIXI'
            }

            if (packageName?.startsWith('@pixi/')) {
              return getPackageNamespace(packageName) || 'PIXI'
            }
          }
        }
      },
      minify: false
    }
  }
})
