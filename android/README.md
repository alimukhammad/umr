# Umr for Android (Google Play)

The Android app `uz.umr.app` is a Trusted Web Activity: a thin Android shell that opens https://umr.grader.uz full-screen, using the phone's Chrome. Every website update reaches the app without a new upload. It was generated with Google's [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap); `twa-manifest.json` holds its settings.

Inside the app, Life Emoji is never offered: locked emoji and code entry are hidden, so there's no outside payment (Google Play's billing rules). The dove stays free, and emoji unlocked on the website still show, because the app shares Chrome's storage for umr.grader.uz.

## 1. Add the signing secrets (once)

The upload keystore `umr-upload.keystore` and its password were sent to you separately. Keep both safe and backed up: Google Play only accepts updates signed with this key (unless you ask Google to reset it).

In the GitHub repo, open **Settings → Secrets and variables → Actions → Secrets → New repository secret** and add:

| Name | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the contents of `umr-upload.keystore.base64.txt` (sent with the keystore) |
| `ANDROID_KEYSTORE_PASSWORD` | the password |

## 2. Build the app

**Actions → Build Android app → Run workflow.** Enter a version code (1 for the first upload, then 2, 3…) and a version name (1.0.0). When it finishes, download the **umr-android** artifact. It contains:

- `app-release.aab`: upload this to Google Play.
- `app-release.apk`: install it directly on an Android phone for a quick test.

## 3. Google Play Console (personal account)

1. **Create app:** name **Umr**, default language Uzbek, App, Free.
2. **App signing:** accept Play App Signing. Google then signs the app with its own key.
3. **Add Google's key to the website (important):** Play Console → **Test and release → Setup → App signing** shows the **App signing key certificate SHA-256**. Add it to `public/.well-known/assetlinks.json` in this repo, next to the upload key fingerprint already there, and push. Without it, the app shows a browser address bar at the top.
4. **Store listing:** short and full description, icon (`android/store_icon.png`), at least 2 phone screenshots, feature graphic 1024 × 500. Write it in Uzbek, Russian and English.
5. **App content:**
   - **Privacy policy URL:** needed before publishing. Umr doesn't have one yet; see the to-do list.
   - **Data safety:** the app stores the birth date, notes and milestones on the device only, and collects nothing on a server. If someone signs up for the weekly email, the email address goes to a Google Sheet.
   - **Account deletion:** Umr has no accounts; say so. Settings → Delete everything clears the phone.
   - **Content rating** questionnaire; **target audience** 18+ (Umr is for adults).
6. **Closed test:** new personal accounts must run a closed test with at least **12 testers for 14 days in a row** before applying for production. Recruit 15 to cover drop-outs, and add their Gmail addresses under **Testing → Closed testing**.
7. **Apply for production** after the 14 days, then release.

## Updating the app

Website changes need no new upload. Only rebuild the app (with a higher version code) if you change the Android settings, such as the icon, colours or `twa-manifest.json`.

## Checking the link to the website

After deploying, https://umr.grader.uz/.well-known/assetlinks.json must show the fingerprints. You can test it with Google's tool: https://developers.google.com/digital-asset-links/tools/generator
