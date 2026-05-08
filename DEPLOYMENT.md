# Firebase + OAuth deployment checklist

## 1. Firebase project
- Create a Firebase project.
- Enable Authentication with Google provider.
- Create Firestore database.
- Deploy Firestore rules from `firebase/`.

## 2. Hosting + Functions
- Install Firebase CLI.
- Set project in `.firebaserc`.
- Run `npm install` in root and `functions/`.
- Build frontend with `npm run build`.
- Build functions with `cd functions && npm run build`.
- Deploy with `firebase deploy`.

## 3. Secret management
Use Firebase Functions secrets instead of plain environment variables for production credentials.
Suggested secrets:
- `ZERODHA_API_KEY`
- `ZERODHA_API_SECRET`
- `ZERODHA_REDIRECT_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URL`

## 4. Redirect URIs
Configure these exact redirect URIs in provider consoles:
- Zerodha: `https://<your-domain>/api/oauth/zerodha/callback`
- Google: `https://<your-domain>/api/oauth/google/callback`

The redirect URI must exactly match the configured URI, including scheme, host, path, and trailing slash behavior.

## 5. First live test
- Sign in with Firebase Auth.
- Call `connectZerodha` from UI, finish broker login, confirm connection doc saved.
- Call `connectGmailMailbox`, grant `gmail.readonly`, confirm refresh token saved.
- Run `syncZerodha` and verify holdings docs appear.
- Run `syncGmailStatements` and verify parsed statement documents appear in Firestore.

## 6. Production hardening
- Encrypt or isolate tokens before broader usage.
- Add issuer-specific PDF parsers.
- Keep statements Firestore-only unless you later choose external archival storage.
- Add scheduled functions for nightly sync.
- Add audit logs and sync error notifications.
