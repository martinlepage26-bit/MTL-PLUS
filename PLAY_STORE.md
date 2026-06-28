# Montréal+ — Google Play release runbook

How to take this repo from source to a paid listing on the Play Store. The web
app is wrapped with **Capacitor** (native Android shell around the bundled web
assets) and sells a **Free / Household / Pro / Team** ladder through **Google
Play subscriptions** via `cordova-plugin-purchase` (first-party Play Billing, no
third-party service).

---

## 1. What is already done (in this repo)

- Capacitor 7 initialised. App name `Montréal+`, package id `ca.pharosai.montrealplus`.
- Native Android project generated under `android/`.
- App icons + splash screens generated for every density (`assets/` sources, regenerate with `npm run icons`).
- Billing wired: `billing.js` drives Play subscriptions natively and no-ops in a browser. `upgrade()` in `app.js` routes through it.
- `BILLING` permission injected by the plugin (merged at build).

## 2. One permanent decision: the package id

`ca.pharosai.montrealplus` is a **placeholder**. The application id can **never
change after the first publish**. If you want a different one (for example a
dedicated `montrealplus.app` domain), change it **now**, before the first upload:

- `capacitor.config.json` -> `appId`
- `android/app/build.gradle` -> `namespace` and `applicationId`
- then `npm run sync`

## 3. Build machine prerequisites

This box has Node but no JDK/Android SDK, so the compile happens on your WSL/dev
machine:

- **Android Studio** (bundles the SDK and a JDK). Open it once, accept SDK licenses.
- JDK 17+ (21 recommended). Android Studio's bundled JDK is fine.
- From a fresh clone: `npm install` then `npm run sync`.

## 4. Generate the upload keystore (once, keep it forever)

```bash
keytool -genkey -v -keystore montrealplus-upload.keystore \
  -alias upload -keyalg RSA -keysize 2048 -validity 9125
```

Store it somewhere safe and backed up. Losing it means you cannot ship updates.
It is gitignored (`.gitignore` blocks `*.keystore`, `*.jks`). Create
`android/keystore.properties` (also gitignored):

```properties
storeFile=/absolute/path/montrealplus-upload.keystore
storePassword=...
keyAlias=upload
keyPassword=...
```

Then add a `signingConfigs` block referencing it in `android/app/build.gradle`,
or just use Android Studio's **Build > Generate Signed App Bundle** wizard, which
handles signing for you. Google's **Play App Signing** manages the real signing
key; your keystore is only the *upload* key.

## 5. Build the .aab

Android Studio: **Build > Generate Signed App Bundle > Android App Bundle**.

Or CLI:

```bash
npm run sync
cd android && ./gradlew bundleRelease
# output: android/app/build/outputs/bundle/release/app-release.aab
```

Upload that `.aab` to Play Console.

## 6. Play Console account

- Register at https://play.google.com/console — **$25 one-time** fee.
- A **company/organization** account (vs personal) avoids the testing gate in
  step 9 and shows a business name. Worth it if PHAROS is the publisher.
- Create the app, set default language, declare it as an app (not a game),
  free-to-install (the money comes from subscriptions).

## 7. Create the three subscriptions

Play Console -> **Monetize > Products > Subscriptions**. Create one subscription
per tier, using **exactly** these product ids (they must match `billing.js`):

| Plan      | Product id                  | Price in code |
|-----------|-----------------------------|---------------|
| Household | `montrealplus.sub.household`| $9.99 / mo    |
| Pro       | `montrealplus.sub.pro`      | $49 / mo      |
| Team      | `montrealplus.sub.team`     | $199+ / mo    |

For each: add a **base plan** (auto-renewing, monthly), set the price, and
**activate** it. Google's cut on subscriptions is 15%. If you change an id in
Play Console, change `PLAN_PRODUCTS` in `billing.js` to match, then rebuild.

## 8. Test purchases without paying

- Play Console -> **Setup > License testing**: add tester Gmail addresses. They
  can buy subscriptions with test cards (no real charge).
- Upload the `.aab` to the **Internal testing** track, add the same accounts as
  testers, install via the opt-in link, and run a real purchase to verify the
  `billing.js` order -> verify -> `applyPlan` flow end to end.
- **This billing flow has not yet been tested on a device.** Step 8 is where you
  confirm it. Watch for: products resolving (`store.get` returns offers),
  purchase completing, and the plan unlocking in the UI after verification.

## 9. The slow gate: closed testing (new personal accounts)

If you registered a **personal** account after late 2023, Google requires a
**closed test with ~20 testers opted in for 14 continuous days** before you can
request production access. Verify the current number in the Console; Google
moves it. **Start this early**, it is the long pole. A company account is exempt.

## 10. Required store-listing forms

- **Privacy policy URL** (mandatory; the app handles addresses/civic data). Host
  a policy page, e.g. on pharos-ai.ca, and paste the URL.
- **Data safety** form: declare what you collect (address, usage) and how it is used.
- **Content rating** questionnaire (IARC).
- **Target audience** and **ads** declarations (no ads here).
- Store listing: short + full description, screenshots (phone), 512x512 icon
  (`assets/icon-only.png`), feature graphic 1024x500.

## 11. Release to production

After the testing gate clears: promote the build to **Production**, complete the
release, submit for review. First review can take a few days.

## 12. Shipping an update later

1. Bump `versionCode` (must increase) and `versionName` in `android/app/build.gradle`.
2. `npm run sync`
3. Rebuild the signed `.aab` (step 5) and upload a new release.

## 13. Open items

- [ ] Confirm or change the permanent package id (step 2).
- [ ] Decide personal vs company Play account (step 6 / 9).
- [ ] Create + activate the three subscriptions (step 7).
- [ ] **Test the purchase flow on a device** (step 8) — billing is reviewed but unverified.
- [ ] Host a privacy policy and fill the Data safety form (step 10).
- [ ] Provide store assets (screenshots, feature graphic, descriptions).
