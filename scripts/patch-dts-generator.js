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

const stripPatchedBlocks = (content) => {
  const lines = content.split('\n')
  const nextLines = []
  const skipBlock = (startIndex) => {
    let endIndex = startIndex
    for (; endIndex < lines.length; endIndex += 1) {
      if (lines[endIndex].includes('declarations.set(fileName, data);')) {
        // Skip the closing "});" line if it exists.
        if (lines[endIndex + 1]?.includes('});')) {
          endIndex += 1
        }
        break
      }
    }
    return endIndex
  }
  for (let i = 0; i < lines.length; i += 1) {
    const isReferenceTargetsBlock = lines[i].includes('const referenceTargets = [')
    const isLegacyBlock =
      lines[i].includes('declarations.forEach((data, fileName) => {') &&
      lines[i + 1]?.includes('if (data.startsWith(\'/// <reference\'))')
    if (isReferenceTargetsBlock || isLegacyBlock) {
      i = skipBlock(i)
      continue
    }
    nextLines.push(lines[i])
  }
  return nextLines.join('\n')
}

let nextPatchContent = stripPatchedBlocks(patchContent)

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

if (nextPatchContent !== patchContent) {
  writeFileSync(patchFile, nextPatchContent)
}
