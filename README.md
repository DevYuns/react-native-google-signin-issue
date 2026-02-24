# react-native-google-signin-issue

Minimal Expo + React Native repro for iOS Google OAuth callback failures in `@react-native-google-signin/google-signin`.

## Target Symptoms

1. Crash:
   - `An OAuth redirect was sent to a OIDExternalUserAgentSession after it already completed.`
2. Intermittent no-token path:
   - Sign-in completes from UI perspective but no usable id token is returned for backend auth.

## Stack Signature (Crash Case)

Typical key frames:

- `-[OIDAuthorizationSession resumeExternalUserAgentFlowWithURL:]`
- `-[GIDSignIn handleURL:]`
- `-[GULAppDelegateSwizzler application:openURL:options:]`

## Setup

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_GOOGLE_SIGNIN_WEBID` in `.env`.
3. Replace placeholder values in:
   - `GoogleService-Info.plist`
   - `google-services.json`
4. Install dependencies:

```bash
npm install
```

5. Generate native projects:

```bash
npm run prebuild
```

6. Run iOS:

```bash
npm run ios
```

## Reproduction Steps

1. Tap `Sign in with Google`.
2. Complete consent in external Safari.
3. Return to app via callback.
4. Repeat attempts and app foreground transitions.

## Notes

- This repro intentionally includes Firebase AppDelegate proxy/swizzling path.
- URL logs are sanitized in-app (query removed) but please sanitize further before posting externally.

## Extra Docs

- `docs/repro-steps.md`
- `docs/environment.md`
- `docs/known-related-links.md`
