# Signing the release APK

The release keystore's path and passwords are **never** stored in the repo in
plaintext anymore. `android/app/build.gradle` reads them from environment
variables first, and only falls back to a local `android/keystore.properties`
file for convenience — and that file is gitignored, so it never leaves your
machine.

## What changed and why

Previously `android/keystore.properties` held the store/key passwords as
plain text, committed alongside the actual `release.keystore` file. Anyone
who obtained a copy of the project (a zip, a backup, a leaked laptop, an
overly-permissive cloud folder) could have used them to sign a malicious APK
that Android would treat as a legitimate update to this exact app — a very
high-impact secret to leak. It's now handled the standard way: via
environment variables, kept out of source control entirely.

## Recommended: environment variables (CI, or your own shell)

Set these before running `npm run android:apk`:

| Variable | Meaning |
| --- | --- |
| `ANDROID_KEYSTORE_PATH` | Path to `release.keystore`, relative to `android/` (e.g. `app/release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias (e.g. `nearby-health`) |
| `ANDROID_KEY_PASSWORD` | Key password |

```bash
export ANDROID_KEYSTORE_PATH="app/release.keystore"
export ANDROID_KEYSTORE_PASSWORD="…"
export ANDROID_KEY_ALIAS="nearby-health"
export ANDROID_KEY_PASSWORD="…"
npm run android:apk
```

In GitHub Actions / most CI systems, store these as encrypted secrets and
inject them as env vars into the build step — never echo them into logs.

## Alternative: local `keystore.properties` (dev machine only)

Copy the example file and fill in real values:

```bash
cp android/keystore.properties.example android/keystore.properties
```

Edit `android/keystore.properties` with the real password/alias. This file
is gitignored (`android/keystore.properties` in `.gitignore`) — double check
`git status` never shows it before pushing anything.

## The keystore file itself

`android/app/release.keystore` is your app's actual signing identity — if
you lose it, you can never publish an update under the same signature again
(Play Store / most install flows require the same signing key for updates).

- Keep at least one secure backup **off** this project folder — a password
  manager's file-attachment feature or an encrypted vault, not a plain cloud
  drive folder or email.
- It's already gitignored (`android/app/*.keystore`); confirm it's not
  present in git history (`git log --all -- android/app/*.keystore`) —
  if it ever was committed, treat the key as compromised and re-key.
