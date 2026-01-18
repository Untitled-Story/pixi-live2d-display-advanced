/* eslint-disable no-redeclare */
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const dtsPackageJson = require('dts-bundle-generator/package.json')
import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const insertionLineNumber = 102
const insertionLineIndex = insertionLineNumber - 1

const dtsGenValidatedVersion = '6.11.0'

if (dtsPackageJson.version !== dtsGenValidatedVersion) {
  throw new Error(
    `The version of installed dts-bundle-generator has not been validated: ${dtsPackageJson.version}, cannot patch types.`
  )
}

const refFile = resolve(__dirname, '../src/common.ts')
const patchFile = resolve(__dirname, '../node_modules/dts-bundle-generator/dist/compile-dts.js')

const typeRefs = readFileSync(refFile, 'utf8')
  .split('\n')
  .filter((line) => line.startsWith('/// <reference'))
  .join('\n')

const insertion = `
    const referenceTargets = [
        path.join('src', 'index.d.ts'),
        path.join('src', 'extra.d.ts')
    ];
    declarations.forEach((data, fileName) => {
        if (!referenceTargets.some((target) => fileName.endsWith(target))) {
            return;
        }
        if (data.startsWith('/// <reference')) {
            data = data.replace(/\\/\\/\\/ <[\\s\\S]+\\/>/m, ${JSON.stringify(typeRefs)});
        } else {
            data = ${JSON.stringify(typeRefs)} + '\\n' + data;
        }
        declarations.set(fileName, data);
    });
`

const patchContent = readFileSync(patchFile, 'utf8')

const legacyInsertion = `
    declarations.forEach((data, fileName) => {
        if (data.startsWith('/// <reference')) {
            data = data.replace(/\\/\\/\\/ <[\\s\\S]+\\/>/m, ${JSON.stringify(typeRefs)});
            declarations.set(fileName, data);
        }
    });
`

if (!patchContent.includes(insertion)) {
  let nextPatchContent = patchContent

  if (nextPatchContent.includes(legacyInsertion)) {
    nextPatchContent = nextPatchContent.replace(legacyInsertion, insertion)
  } else {
    const patchContentLines = nextPatchContent.split('\n')

    const lineIndex = patchContentLines.findIndex(
      (line, i) => i >= insertionLineIndex && line.includes('return declarations;')
    )

    if (lineIndex < insertionLineIndex) {
      throw new Error('Cannot find insertion point')
    }

    patchContentLines.splice(lineIndex, 0, insertion)
    nextPatchContent = patchContentLines.join('\n')
  }

  writeFileSync(patchFile, nextPatchContent)
} else {
  // already patched, skip
}
