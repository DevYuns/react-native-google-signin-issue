import {
  GoogleSignin,
  isCancelledResponse,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin'

export type GoogleSignInResult =
  | {
      status: 'success'
      responseType: 'success'
      idToken: string
      email: string | null
    }
  | {
      status: 'cancelled'
      responseType: 'cancelled'
    }
  | {
      status: 'no-id-token'
      responseType: string
    }

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_SIGNIN_WEBID,
  offlineAccess: true,
})

async function recoverIdTokenFromSession(): Promise<{
  idToken: string
  email: string | null
} | null> {
  try {
    const silent = await GoogleSignin.signInSilently()

    if (silent.type === 'success' && silent.data.idToken) {
      return {
        idToken: silent.data.idToken,
        email: silent.data.user.email ?? null,
      }
    }
  } catch {
    // no-op for repro app
  }

  try {
    const tokens = await GoogleSignin.getTokens()
    const user = GoogleSignin.getCurrentUser()

    if (tokens.idToken) {
      return {
        idToken: tokens.idToken,
        email: user?.user.email ?? null,
      }
    }
  } catch {
    // no-op for repro app
  }

  const user = GoogleSignin.getCurrentUser()

  if (user?.idToken) {
    return {
      idToken: user.idToken,
      email: user.user.email ?? null,
    }
  }

  return null
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  await GoogleSignin.hasPlayServices()

  const response = await GoogleSignin.signIn()

  if (isSuccessResponse(response) && response.data.idToken) {
    return {
      status: 'success',
      responseType: 'success',
      idToken: response.data.idToken,
      email: response.data.user.email ?? null,
    }
  }

  if (isCancelledResponse(response)) {
    if (!GoogleSignin.hasPreviousSignIn()) {
      return {
        status: 'cancelled',
        responseType: 'cancelled',
      }
    }

    const recovered = await recoverIdTokenFromSession()

    if (recovered) {
      return {
        status: 'success',
        responseType: 'success',
        idToken: recovered.idToken,
        email: recovered.email,
      }
    }

    return {
      status: 'cancelled',
      responseType: 'cancelled',
    }
  }

  const recovered = await recoverIdTokenFromSession()

  if (recovered) {
    return {
      status: 'success',
      responseType: 'success',
      idToken: recovered.idToken,
      email: recovered.email,
    }
  }

  return {
    status: 'no-id-token',
    responseType: response.type,
  }
}

export async function clearGoogleSession(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess()
  } catch {
    // no-op for repro app
  }

  try {
    await GoogleSignin.signOut()
  } catch {
    // no-op for repro app
  }
}

export function getCurrentGoogleUserEmail(): string | null {
  return GoogleSignin.getCurrentUser()?.user.email ?? null
}
