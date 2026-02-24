import analytics from '@react-native-firebase/analytics'
import * as Linking from 'expo-linking'
import {StatusBar} from 'expo-status-bar'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {
  AppState,
  type AppStateStatus,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  clearGoogleSession,
  getCurrentGoogleUserEmail,
  signInWithGoogle,
} from './src/auth/googleAuth'
import {clearLogs, logLine, sanitizeUrl, subscribeLogs} from './src/logging/authLogger'

type LastResult =
  | {
      status: 'idle'
      detail: string
    }
  | {
      status: 'success' | 'cancelled' | 'no-id-token' | 'error'
      detail: string
    }

function formatAppState(state: AppStateStatus): string {
  return state === 'active' ? 'active' : state
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [latestUrl, setLatestUrl] = useState<string>('none')
  const [logs, setLogs] = useState<string[]>([])
  const [lastResult, setLastResult] = useState<LastResult>({
    status: 'idle',
    detail: 'No sign-in attempt yet.',
  })

  useEffect(() => {
    const unsubscribeLogs = subscribeLogs(nextLogs => {
      setLogs(nextLogs)
    })

    return () => {
      unsubscribeLogs()
    }
  }, [])

  const onIncomingUrl = useCallback((source: string, url: string | null) => {
    if (!url) {
      return
    }

    const sanitized = sanitizeUrl(url)

    setLatestUrl(sanitized)
    logLine(`[Repro][DeepLink] ${source}: ${sanitized}`)
  }, [])

  useEffect(() => {
    onIncomingUrl('initial', Linking.getLinkingURL())

    const urlSubscription = Linking.addEventListener('url', (event: {url: string}) => {
      onIncomingUrl('event', event.url)
    })

    const appStateSubscription = AppState.addEventListener('change', state => {
      logLine(`[Repro][AppState] ${formatAppState(state)}`)

      if (state === 'active') {
        onIncomingUrl('foreground', Linking.getLinkingURL())
      }
    })

    return () => {
      urlSubscription.remove()
      appStateSubscription.remove()
    }
  }, [onIncomingUrl])

  useEffect(() => {
    void (async () => {
      try {
        await analytics().setAnalyticsCollectionEnabled(true)
        await analytics().logEvent('repro_app_open')
        logLine('[Repro][Firebase] Analytics initialized')
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        logLine(`[Repro][Firebase] Initialization failed: ${message}`)
      }
    })()
  }, [])

  const onPressGoogleSignIn = useCallback(async () => {
    if (isLoading) {
      return
    }

    setIsLoading(true)
    logLine('[Repro][SignIn] Google sign-in start')

    try {
      const result = await signInWithGoogle()

      if (result.status === 'success') {
        logLine(
          `[Repro][SignIn] success type=${result.responseType} email=${result.email ?? 'none'} idTokenLength=${result.idToken.length}`,
        )

        setLastResult({
          status: 'success',
          detail: `success (${result.responseType}), idTokenLength=${result.idToken.length}`,
        })

        return
      }

      if (result.status === 'cancelled') {
        logLine('[Repro][SignIn] cancelled')
        setLastResult({status: 'cancelled', detail: 'cancelled'})

        return
      }

      logLine(
        `[Repro][SignIn] no-id-token responseType=${result.responseType}`,
      )
      setLastResult({
        status: 'no-id-token',
        detail: `no-id-token (${result.responseType})`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      logLine(`[Repro][SignIn] ERROR ${message}`)
      setLastResult({status: 'error', detail: message})
    } finally {
      setIsLoading(false)
    }
  }, [isLoading])

  const onPressClearSession = useCallback(async () => {
    await clearGoogleSession()
    logLine('[Repro][SignIn] Session cleared')
    setLastResult({status: 'idle', detail: 'Session cleared'})
  }, [])

  const onPressClearLogs = useCallback(() => {
    clearLogs()
    logLine('[Repro] Logs cleared')
  }, [])

  const currentUserEmail = useMemo(() => getCurrentGoogleUserEmail(), [logs])

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>RN Google Sign-In iOS Repro</Text>
        <Text style={styles.subtitle}>
          Target issue: duplicate OAuth callback / intermittent missing idToken
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Latest callback URL (sanitized)</Text>
        <Text style={styles.value}>{latestUrl}</Text>

        <Text style={styles.label}>Current signed-in email</Text>
        <Text style={styles.value}>{currentUserEmail ?? 'none'}</Text>

        <Text style={styles.label}>Last result</Text>
        <Text style={styles.value}>{lastResult.detail}</Text>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          disabled={isLoading}
          onPress={onPressGoogleSignIn}
          style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}>
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </Text>
        </Pressable>

        <Pressable onPress={onPressClearSession} style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.secondaryButtonText}>Clear Session</Text>
        </Pressable>

        <Pressable onPress={onPressClearLogs} style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.secondaryButtonText}>Clear Logs</Text>
        </Pressable>
      </View>

      <View style={styles.logWrapper}>
        <Text style={styles.logTitle}>Runtime Logs</Text>
        <ScrollView style={styles.logList} contentContainerStyle={styles.logListContent}>
          {logs.length === 0 ? (
            <Text style={styles.emptyLogText}>No logs yet.</Text>
          ) : (
            logs.map(line => (
              <Text key={line} style={styles.logLine}>
                {line}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 16,
  },
  header: {
    marginTop: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#121212',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#4f5666',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#dde2ef',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f5666',
    marginTop: 6,
  },
  value: {
    fontSize: 13,
    color: '#1f2633',
    marginTop: 2,
  },
  buttonRow: {
    gap: 8,
    marginBottom: 12,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#111827',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c8d0e4',
  },
  secondaryButtonText: {
    color: '#1f2633',
    fontSize: 14,
    fontWeight: '600',
  },
  logWrapper: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dde2ef',
    overflow: 'hidden',
    marginBottom: 12,
  },
  logTitle: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#1f2633',
    borderBottomWidth: 1,
    borderBottomColor: '#e6ebf7',
  },
  logList: {
    flex: 1,
  },
  logListContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  logLine: {
    fontSize: 11,
    color: '#283043',
  },
  emptyLogText: {
    fontSize: 12,
    color: '#6f7787',
  },
})
