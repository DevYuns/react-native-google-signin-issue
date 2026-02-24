# Reproduction Steps

## Prerequisites

1. Xcode 16.4+
2. CocoaPods 1.16+
3. Node.js 20+
4. A valid Firebase project + Google OAuth client setup

## Setup

1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_GOOGLE_SIGNIN_WEBID` to your real web client id.
3. Replace placeholder values in `GoogleService-Info.plist`.
4. Replace placeholder values in `google-services.json`.
5. Install dependencies:

```bash
npm install
```

6. Generate native projects:

```bash
npm run prebuild
```

7. Start iOS dev build:

```bash
npm run ios
```

## Repro Flow

1. Launch app.
2. Tap `Sign in with Google`.
3. Complete OAuth in external Safari.
4. Return to app through callback scheme.
5. Repeat sign-in attempts and foreground/background cycles.

## Expected for this Repro

At least one of these may occur:

1. Crash with `An OAuth redirect was sent to a OIDExternalUserAgentSession after it already completed.`
2. No crash, but sign-in returns no usable id token path and auth flow stalls.

## Capture Logs

Use Xcode console and in-app log panel. Sanitize URL query values before sharing publicly.
