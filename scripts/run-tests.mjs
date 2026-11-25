// `npm test`: compiles the framework-free TypeScript modules (type errors fail the run) and runs every tests/*.test.cjs
// in its own Node process. Nothing here needs a browser, a network or a Spotify account: Spotify and iTunes are faked.
// TSC and TYPE_ROOTS can be set when the TypeScript compiler or @types live somewhere else than node_modules.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const work = mkdtempSync(join(tmpdir(), 'statsify-tests-'))
const out = join(work, 'out')
const tsc = process.env.TSC || join(root, 'node_modules', '.bin', 'tsc')
const typeRoots = process.env.TYPE_ROOTS || join(root, 'node_modules', '@types')
const modules = ['server/session', 'server/spotify', 'server/flows', 'server/apple', 'server/artistPhoto', 'spotify/types', 'spotify/merge', 'spotify/store', 'spotify/client', 'spotify/sync', 'spotify/genres', 'apiArt', 'artistPhoto', 'listen', 'stats', 'import', 'db']

writeFileSync(
  join(work, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: { target: 'es2022', module: 'commonjs', strict: true, lib: ['es2022', 'dom'], types: ['node'], typeRoots: [typeRoots], skipLibCheck: true, noEmitOnError: true, rootDir: join(root, 'lib'), outDir: out },
    files: modules.map((m) => join(root, 'lib', `${m}.ts`)),
  }),
)
const build = spawnSync(tsc, ['-p', join(work, 'tsconfig.json')], { stdio: 'inherit' })
if (build.status !== 0) {
  console.error('\nTypeScript did not compile the modules under test.')
  process.exit(build.status ?? 1)
}

let failed = 0
for (const file of readdirSync(join(root, 'tests')).filter((f) => f.endsWith('.test.cjs')).sort()) {
  console.log(`\n=== ${file}`)
  const run = spawnSync(process.execPath, [join(root, 'tests', file)], { stdio: 'inherit', env: { ...process.env, STATSIFY_OUT: out } })
  if (run.status !== 0) failed++
}
console.log(failed ? `\n${failed} test file(s) FAILED` : '\nAll test files passed')
process.exit(failed ? 1 : 0)
