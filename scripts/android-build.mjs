#!/usr/bin/env node
/**
 * One-command Android build for Eth-Links (Windows, macOS, Linux).
 *
 *   npm run android:apk              → debug APK (installable on any phone)
 *   npm run android:apk:release      → release APK (signed if a release key is configured)
 *   npm run android:aab              → release App Bundle for Google Play
 *
 * Extra options (after `--`):  --version-code 5  --version-name 1.0.4  --clean  --skip-sync
 *   e.g. npm run android:apk -- --version-code 5
 *
 * What it does: finds Java 21 (Android Studio's bundled JBR, JAVA_HOME or PATH) and the
 * Android SDK, writes android/local.properties, runs `cap sync android`, runs Gradle,
 * and copies the result to ./android-builds/.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ANDROID = path.join(ROOT, 'android')
const IS_WIN = platform() === 'win32'
const IS_MAC = platform() === 'darwin'
const MIN_JAVA = 21

const c = { red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m`, bold: (s) => `\x1b[1m${s}\x1b[0m` }
const step = (s) => console.log(`\n${c.bold('▶')} ${s}`)
const fail = (msg) => { console.error(`\n${c.red('✖')} ${msg}\n`); process.exit(1) }

// ── Arguments ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const kind = ['debug', 'release', 'bundle'].includes(args[0]) ? args[0] : 'debug'
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined }
const flag = (name) => args.includes(`--${name}`)
const versionCode = opt('version-code')
const versionName = opt('version-name')
if (versionCode && !/^\d+$/.test(versionCode)) fail('--version-code must be a whole number')

// ── Java ────────────────────────────────────────────────────────────────────
const javaBin = (home) => path.join(home, 'bin', IS_WIN ? 'java.exe' : 'java')

function javaMajor(javaExe) {
    const r = spawnSync(javaExe, ['-version'], { encoding: 'utf8' })
    const out = `${r.stderr ?? ''}${r.stdout ?? ''}`
    const m = out.match(/version "(\d+)(?:\.(\d+))?/)
    if (!m) return null
    return m[1] === '1' ? Number(m[2]) : Number(m[1])
}

function globDirs(parent, test) {
    try { return readdirSync(parent).filter(test).map((d) => path.join(parent, d)) } catch { return [] }
}

function javaCandidates() {
    const list = []
    if (process.env.JAVA_HOME) list.push(['JAVA_HOME', process.env.JAVA_HOME])
    const pf = process.env.ProgramFiles || 'C:\\Program Files'
    const local = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local')
    if (IS_WIN) {
        list.push(['Android Studio', path.join(pf, 'Android', 'Android Studio', 'jbr')])
        list.push(['Android Studio', path.join(local, 'Programs', 'Android Studio', 'jbr')])
        list.push(['Android Studio Preview', path.join(pf, 'Android', 'Android Studio Preview', 'jbr')])
        for (const d of globDirs(path.join(local, 'JetBrains', 'Toolbox', 'apps', 'AndroidStudio', 'ch-0'), () => true)) list.push(['Android Studio (Toolbox)', path.join(d, 'jbr')])
        for (const vendor of ['Eclipse Adoptium', 'Java', 'Microsoft', 'Zulu', 'Amazon Corretto']) {
            for (const d of globDirs(path.join(pf, vendor), () => true)) list.push([vendor, d]) // version checked below
        }
    } else if (IS_MAC) {
        list.push(['Android Studio', '/Applications/Android Studio.app/Contents/jbr/Contents/Home'])
        list.push(['Android Studio', path.join(homedir(), 'Applications', 'Android Studio.app', 'Contents', 'jbr', 'Contents', 'Home')])
        for (const d of globDirs('/Library/Java/JavaVirtualMachines', () => true)) list.push(['JDK', path.join(d, 'Contents', 'Home')])
    } else {
        for (const p of ['/opt/android-studio/jbr', path.join(homedir(), 'android-studio', 'jbr'), '/snap/android-studio/current/jbr', '/usr/local/android-studio/jbr']) list.push(['Android Studio', p])
        for (const d of globDirs('/usr/lib/jvm', (n) => /2\d/.test(n))) list.push(['JDK', d])
    }
    return list
}

function findJava() {
    for (const [label, home] of javaCandidates()) {
        if (!existsSync(javaBin(home))) continue
        const v = javaMajor(javaBin(home))
        if (v && v >= MIN_JAVA) return { home, version: v, label }
    }
    // java on PATH: ask it for its home
    const r = spawnSync('java', ['-XshowSettings:properties', '-version'], { encoding: 'utf8', shell: IS_WIN })
    const home = `${r.stderr ?? ''}`.match(/java\.home = (.+)/)?.[1]?.trim()
    if (home && existsSync(javaBin(home))) {
        const v = javaMajor(javaBin(home))
        if (v && v >= MIN_JAVA) return { home, version: v, label: 'PATH' }
    }
    return null
}

// ── Android SDK ─────────────────────────────────────────────────────────────
function findSdk() {
    const lp = path.join(ANDROID, 'local.properties')
    const fromLocal = existsSync(lp) ? readFileSync(lp, 'utf8').match(/^sdk\.dir=(.+)$/m)?.[1]?.replace(/\\\\/g, '\\').replace(/\\:/g, ':').trim() : undefined
    const candidates = [
        process.env.ANDROID_HOME,
        process.env.ANDROID_SDK_ROOT,
        fromLocal,
        IS_WIN ? path.join(process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local'), 'Android', 'Sdk') : undefined,
        IS_MAC ? path.join(homedir(), 'Library', 'Android', 'sdk') : undefined,
        !IS_WIN && !IS_MAC ? path.join(homedir(), 'Android', 'Sdk') : undefined,
    ].filter(Boolean)
    return candidates.find((p) => existsSync(path.join(p, 'platforms')) || existsSync(path.join(p, 'platform-tools'))) ?? null
}

function run(cmd, cmdArgs, opts = {}) {
    console.log(c.yellow(`  $ ${cmd} ${cmdArgs.join(' ')}`))
    const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', shell: IS_WIN, ...opts })
    if (r.status !== 0) fail(`Command failed: ${cmd} ${cmdArgs.join(' ')}`)
}

// ── Go ──────────────────────────────────────────────────────────────────────
console.log(c.bold(`Eth-Links Android build — ${kind === 'bundle' ? 'release App Bundle (.aab)' : `${kind} APK`}`))

step('Finding Java 21+')
const java = findJava()
if (!java) {
    fail(`Java ${MIN_JAVA}+ not found.
  Fix one of:
   • Install Android Studio (it bundles Java at "C:\\Program Files\\Android\\Android Studio\\jbr"), or
   • Install Temurin JDK 21: https://adoptium.net/temurin/releases/?version=21
  Or skip local builds entirely: use the "Build Android APK" GitHub Action (see docs/ANDROID_BUILD.md).`)
}
console.log(`  ${c.green('✔')} Java ${java.version} (${java.label}): ${java.home}`)

step('Finding the Android SDK')
const sdk = findSdk()
if (!sdk) {
    fail(`Android SDK not found.
  Install it once with Android Studio → More Actions → SDK Manager (default location
  ${IS_WIN ? '%LOCALAPPDATA%\\Android\\Sdk' : '~/Android/Sdk'}), or set ANDROID_HOME.
  Or skip local builds entirely: use the "Build Android APK" GitHub Action (see docs/ANDROID_BUILD.md).`)
}
writeFileSync(path.join(ANDROID, 'local.properties'), `# Written by scripts/android-build.mjs\nsdk.dir=${sdk.replace(/\\/g, '\\\\').replace(/:/g, '\\:')}\n`)
console.log(`  ${c.green('✔')} ${sdk}`)

step('Checking Firebase config (push notifications)')
if (existsSync(path.join(ANDROID, 'app', 'google-services.json'))) {
    console.log(`  ${c.green('✔')} android/app/google-services.json found — push notifications enabled`)
} else {
    console.log(c.yellow(`  ! android/app/google-services.json missing — the app will work, but push notifications stay off.`))
}

if (!flag('skip-sync')) {
    step('Syncing Capacitor (cap sync android)')
    run('npx', ['cap', 'sync', 'android'], { cwd: ROOT })
}

const env = { ...process.env, JAVA_HOME: java.home, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk }
env.PATH = `${path.join(java.home, 'bin')}${path.delimiter}${process.env.PATH ?? process.env.Path ?? ''}`
const task = kind === 'debug' ? 'assembleDebug' : kind === 'release' ? 'assembleRelease' : 'bundleRelease'
const gradleArgs = [...(flag('clean') ? ['clean'] : []), task, '--console=plain']
if (versionCode) gradleArgs.push(`-PversionCode=${versionCode}`)
if (versionName) gradleArgs.push(`-PversionName=${versionName}`)

step(`Building with Gradle (${task}) — the first run downloads Gradle + dependencies, ~5–10 min`)
if (IS_WIN) run('gradlew.bat', gradleArgs, { cwd: ANDROID, env })
else run('sh', ['./gradlew', ...gradleArgs], { cwd: ANDROID, env, shell: false })

// ── Collect the output ──────────────────────────────────────────────────────
const outDir = kind === 'bundle'
    ? path.join(ANDROID, 'app', 'build', 'outputs', 'bundle', 'release')
    : path.join(ANDROID, 'app', 'build', 'outputs', 'apk', kind)
const ext = kind === 'bundle' ? '.aab' : '.apk'
const built = globDirs(outDir, (n) => n.endsWith(ext))
if (!built.length) fail(`Build finished but no ${ext} was found in ${outDir}`)
const unsigned = built[0].includes('unsigned')

const dest = path.join(ROOT, 'android-builds')
mkdirSync(dest, { recursive: true })
const name = `eth-links-${kind === 'bundle' ? 'release' : kind}${versionName ? `-v${versionName}` : ''}${versionCode ? `-${versionCode}` : ''}${unsigned ? '-unsigned' : ''}${ext}`
copyFileSync(built[0], path.join(dest, name))

console.log(`\n${c.green('✔ Done:')} ${c.bold(path.join(dest, name))}`)
if (kind === 'debug') {
    console.log(`  Install: copy it to your phone and open it (allow "Install unknown apps"), or with a USB cable:
    adb install -r "${path.join(dest, name)}"`)
}
if (unsigned) console.log(c.yellow(`  This ${ext} is unsigned — set up a release key (see docs/ANDROID_BUILD.md) to install or upload it.`))
