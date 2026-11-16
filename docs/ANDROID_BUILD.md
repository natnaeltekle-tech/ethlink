# Building the Eth-Links Android app

## Option A — in the cloud (no Android Studio)

1. One time: add the secret **`GOOGLE_SERVICES_JSON`** (GitHub repo → Settings → Secrets and variables → Actions → New repository secret) and paste the whole contents of `google-services.json`. Without it the app works but push notifications stay off.
2. GitHub → **Actions** → **Build Android APK** → **Run workflow** → keep `debug` → **Run workflow**.
3. When it finishes (~6–10 min), open the run → **Artifacts** → download the zip on your phone, unzip, tap the `.apk`, allow "Install unknown apps".

`release` / `bundle` builds need the signing secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (otherwise the output is unsigned).

## Option B — on your computer

Needs Java 21 (Android Studio's bundled one is found automatically) and the Android SDK (install once via Android Studio → SDK Manager).

```bash
npm install
npm run android:apk                 # debug APK → android-builds/
npm run android:apk -- --version-code 7 --version-name 1.0.6
npm run android:aab                 # Play Store bundle (needs a release key)
```

Release key: create `android/keystore.properties` (never commit it):

```
storeFile=C:/path/to/upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

## Notes

- Debug builds use the project key `android/app/debug.keystore`, so every debug APK (laptop or cloud) installs as an update over the previous one. An app installed from a different key (an older build, or Google Play) must be uninstalled first.
- `google-services.json` goes in `android/app/`. The app checks it at runtime (`window.EthLinksNative.pushReady()`), so a build without it never crashes — it just has no push.
- Android files that the build generates (`android/app/src/main/assets/public`, `capacitor.config.json`) are recreated by `npx cap sync android`, which both options run for you.
