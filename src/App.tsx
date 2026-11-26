import {
  lazy,
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
  type RefObject,
} from 'react'
import { BookOpen, Check, CircleUserRound, House, Search } from 'lucide-react'
import { App as NativeApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { accountAvailable, getAccountSnapshot, signInWithAccountProvider, signOutAccount, subscribeAccount } from './app/account'
import { appName } from './app/branding'
import { useFoodCatalog } from './app/catalog-cache'
import { catalogFoods, type CatalogFood } from './app/data'
import { appReducer, createInitialState, createRecord, type AppAction, type AppState, type FoodItem, type Profile } from './app/model'
import { clearPrivateFoodCache, deletePrivateFood, savePrivateFood, usePrivateFoods } from './app/private-foods'
import { isEveningReminderSupported, onEveningReminderTap, reminderPermissionMessage, restoreEveningReminder } from './app/reminder'
import { dispatch as dispatchAccount, getOnboarding, getSnapshot, saveOnboarding, subscribeState } from './app/storage'
import type { WithdrawalResult } from './screens/AccountWithdrawal'
const HomeScreen = lazy(() =>
  import('./screens/HomeScreen').then((module) => ({ default: module.HomeScreen })),
)
const LogScreen = lazy(() =>
  import('./screens/LogScreen').then((module) => ({ default: module.LogScreen })),
)
const FoodEntryDialog = lazy(() =>
  import('./components/FoodEntryDialog').then((module) => ({ default: module.FoodEntryDialog })),
)
const HistoryScreen = lazy(() =>
  import('./screens/HistoryScreen').then((module) => ({ default: module.HistoryScreen })),
)
const SettingsScreen = lazy(() =>
  import('./screens/SettingsScreen').then((module) => ({ default: module.SettingsScreen })),
)
const StartScreen = lazy(() =>
  import('./screens/StartScreen').then((module) => ({ default: module.StartScreen })),
)
const WithdrawalConfirmation = lazy(() =>
  import('./screens/AccountWithdrawal').then((module) => ({ default: module.WithdrawalConfirmation })),
)

const navigation = [
  {
    id: 'home', label: '오늘', icon: House,
    solidPath: 'M11.35 2.42a1 1 0 0 1 1.3 0l8 6.83a1 1 0 0 1 .35.76V20a2 2 0 0 1-2 2h-5v-6a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v6H5a2 2 0 0 1-2-2v-9.99a1 1 0 0 1 .35-.76z',
  },
  {
    id: 'search', label: '음식 검색', icon: Search,
    solidPath: 'M10.5 2a8.5 8.5 0 1 0 5.04 15.35l4.4 4.4a1.5 1.5 0 0 0 2.12-2.12l-4.4-4.4A8.5 8.5 0 0 0 10.5 2Zm0 3.25a5.25 5.25 0 1 1 0 10.5 5.25 5.25 0 0 1 0-10.5Z',
  },
  {
    id: 'history', label: '섭취 기록', icon: BookOpen,
    solidPath: 'M2.5 4a1.5 1.5 0 0 1 1.5-1.5h3.5c1.35 0 2.61.38 3.5 1.2v17.8c-1-.95-2.38-1.5-3.75-1.5H4a1.5 1.5 0 0 1-1.5-1.5V4Zm19 0A1.5 1.5 0 0 0 20 2.5h-3.5c-1.35 0-2.61.38-3.5 1.2v17.8c1-.95 2.38-1.5 3.75-1.5H20a1.5 1.5 0 0 0 1.5-1.5V4Z',
  },
  {
    id: 'profile', label: '내 설정', icon: CircleUserRound,
    solidPath: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Zm0 8.75a6.1 6.1 0 0 1 5.35 3.18 8 8 0 0 1-10.7 0A6.1 6.1 0 0 1 12 14.75Z',
  },
] as const
type Page = (typeof navigation)[number]['id']
type Screen = Page | 'start'

type NavigationProps = {
  page: Page
  homeOnly?: boolean
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, page: Page) => void
}

function NavigationLinks({ page, mobile, homeOnly, onNavigate }: NavigationProps & { mobile?: boolean }) {
  return navigation.map(({ id, label, icon: Icon, solidPath }) => {
    const disabled = homeOnly && id !== 'home'

    return (
      <a
        href={disabled ? undefined : '#' + id}
        key={id}
        role={disabled ? 'link' : undefined}
        aria-disabled={disabled || undefined}
        aria-current={page === id ? 'page' : undefined}
        onClick={disabled ? undefined : (event) => onNavigate(event, id)}
      >
        {mobile && page === id ? (
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d={solidPath} fillRule="evenodd" />
          </svg>
        ) : (
          <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
        )}
        <span>{label}</span>
      </a>
    )
  })
}

function BottomNavigation({ instant, ...props }: NavigationProps & { instant?: boolean }) {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴" data-instant={instant || undefined}>
      <span
        className="bottom-nav-indicator"
        aria-hidden="true"
        style={{ '--bottom-nav-index': navigation.findIndex(({ id }) => id === props.page) } as CSSProperties}
      />
      <NavigationLinks {...props} mobile />
    </nav>
  )
}

function subscribe(listener: () => void) {
  window.addEventListener('hashchange', listener)
  return () => window.removeEventListener('hashchange', listener)
}
function currentPath() {
  return location.hash.slice(1)
}
function navigate(page: Page) {
  location.hash = page
}

function PageScroll({
  screen,
  main,
  positions,
}: {
  screen: Screen
  main: RefObject<HTMLElement | null>
  positions: RefObject<Map<Screen, number>>
}) {
  const lastScreen = useRef<Screen>(screen)

  // This runs inside Suspense once the destination has its real scroll height.
  useLayoutEffect(() => {
    if (lastScreen.current !== screen) {
      window.scrollTo(0, positions.current.get(screen) ?? 0)
      main.current?.focus({ preventScroll: true })
    }
    lastScreen.current = screen

    function rememberScroll() {
      positions.current.set(screen, window.scrollY)
    }
    window.addEventListener('scroll', rememberScroll, { passive: true })
    return () => window.removeEventListener('scroll', rememberScroll)
  }, [screen, main, positions])

  return null
}

function HomePage({
  state,
  foods,
  onAdd,
  onSaveQuickFoods,
}: {
  state: AppState
  foods: readonly CatalogFood[]
  onAdd: (item: FoodItem, registering: boolean) => Promise<void>
  onSaveQuickFoods: (foodIds: string[]) => void
}) {
  const [entry, setEntry] = useState<CatalogFood | 'manual' | null>(null)
  const quickTrigger = useRef<HTMLButtonElement | null>(null)

  function closeEntry() {
    setEntry(null)
    requestAnimationFrame(() => quickTrigger.current?.focus({ preventScroll: true }))
  }

  return (
    <>
      <HomeScreen
        state={state}
        foods={foods}
        onSaveQuickFoods={onSaveQuickFoods}
        onManualEntry={(trigger) => {
          quickTrigger.current = trigger
          setEntry('manual')
        }}
        onPickFood={(item, trigger) => {
          quickTrigger.current = trigger
          setEntry(item)
        }}
      />
      {entry && (
        <Suspense fallback={<p className="sr-only" role="status">입력창을 여는 중…</p>}>
          <FoodEntryDialog
            item={entry === 'manual' ? undefined : entry}
            profile={state.profileConfigured ? state.profile : undefined}
            records={state.records}
            onClose={closeEntry}
            onSave={async (item) => {
              await onAdd(item, entry === 'manual')
              closeEntry()
            }}
          />
        </Suspense>
      )}
    </>
  )
}

function HomePreview() {
  const [state, setState] = useState(createInitialState)

  function scrollHome(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    window.scrollTo(0, 0)
  }

  return (
    <div className="app-shell" data-screen="home">
      <header className="masthead">
        <div className="masthead-inner">
          <span className="brand"><span className="brand-mark" aria-hidden="true"><span /></span>{appName}</span>
          <nav className="desktop-nav" aria-label="주요 메뉴">
            <NavigationLinks page="home" homeOnly onNavigate={scrollHome} />
          </nav>
          <span className="mobile-title">오늘</span>
        </div>
      </header>
      <main className="workspace" id="app-main">
        <Suspense fallback={<p role="status">화면을 여는 중…</p>}>
          <HomePage
            state={state}
            foods={catalogFoods()}
            onAdd={async (item) => {
              const record = createRecord(item, 'quick')
              setState((current) => appReducer(current, { type: 'ADD_RECORD', record }))
            }}
            onSaveQuickFoods={(foodIds) =>
              setState((current) => appReducer(current, { type: 'SET_QUICK_FOODS', foodIds }))
            }
          />
        </Suspense>
      </main>
      <BottomNavigation page="home" homeOnly onNavigate={scrollHome} />
    </div>
  )
}

export default function App() {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('preview') === 'home') {
    return <HomePreview />
  }
  return <AccountApp />
}

function AccountApp() {
  const account = useSyncExternalStore(subscribeAccount, getAccountSnapshot)
  const ownerId = account.user?.id
  const { state, saveError } = useSyncExternalStore(subscribeState, () => getSnapshot(ownerId))
  const onboarding = useSyncExternalStore(subscribeState, getOnboarding)
  const publicFoods = useFoodCatalog()
  const privateFoods = usePrivateFoods(ownerId)
  const foods = useMemo(() => catalogFoods(privateFoods, publicFoods), [privateFoods, publicFoods])
  const activeFoods = useMemo(() => foods.filter((food) => !food.custom || !food.isDeleted), [foods])
  const [signingOut, setSigningOut] = useState(false)
  const logoutPending = useRef(false)
  const [withdrawalResult, setWithdrawalResult] = useState<WithdrawalResult | null>(null)
  const path = useSyncExternalStore(subscribe, currentPath)
  const settingsDetail = path.startsWith('profile/') ? path.slice('profile/'.length) : undefined
  const page = settingsDetail !== undefined
    ? 'profile'
    : navigation.find((item) => item.id === path)?.id ?? 'home'
  const [instantBottomNav, setInstantBottomNav] = useState(false)
  const [toast, setToast] = useState<{ text: string; undo?: AppAction; ownerId?: string } | null>(null)
  const [calendarHost, setCalendarHost] = useState<HTMLDivElement | null>(null)
  const masthead = useRef<HTMLElement>(null)
  const main = useRef<HTMLElement>(null)
  const positions = useRef(new Map<Screen, number>())
  const publicInformation = settingsDetail === 'privacy' || settingsDetail === 'terms' || settingsDetail === 'account-deletion'
  const appReady = Boolean(ownerId && state.profileConfigured)
  const confirmWithdrawal = !ownerId && withdrawalResult !== null
  const starting = !appReady && !publicInformation && !confirmWithdrawal
  const activeScreen = starting ? 'start' : confirmWithdrawal ? 'profile' : page
  const finishingSetup = Boolean(ownerId && onboarding.login && onboarding.setup && !state.profileConfigured)
  const checkingSession = !ownerId && account.loading && !onboarding.login
  const startState = onboarding.setup ? { ...state, ...onboarding.setup, profileConfigured: true } : state
  const pageTitle = navigation.find((item) => item.id === page)?.label
  const mobileTitle = confirmWithdrawal
    ? '회원 탈퇴'
    : starting ? appName : pageTitle

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return
    let active = true
    const listener = NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (!active) return
      const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]')
      const dialog = dialogs[dialogs.length - 1]
      if (dialog) {
        // Use the same cancelable close request as the dialog's platform Back action.
        if (typeof dialog.requestClose === 'function') dialog.requestClose()
        else dialog.dispatchEvent(new Event('cancel', { cancelable: true }))
        return
      }
      const back = document.querySelector<HTMLButtonElement>('button[data-android-back]')
      if (back) back.click()
      else if (canGoBack && !document.querySelector('.onboarding-screen[data-stage="welcome"]')) history.back()
      else void NativeApp.minimizeApp()
    })
    return () => {
      active = false
      void listener.then(handle => handle.remove())
    }
  }, [])

  useEffect(() => {
    function preventNativeDrag(event: DragEvent) {
      event.preventDefault()
    }

    // The document also covers UI rendered into portal containers.
    document.addEventListener('dragstart', preventNativeDrag, true)
    return () => document.removeEventListener('dragstart', preventNativeDrag, true)
  }, [])

  useEffect(() => {
    if (!ownerId || !onboarding.login || account.loading) return
    if (!getSnapshot(ownerId).state.profileConfigured && onboarding.setup) {
      dispatchAccount(ownerId, { type: 'COMPLETE_SETUP', ...onboarding.setup })
    }
    saveOnboarding({ login: false })
    if (currentPath() !== 'home') location.replace('#home')
  }, [ownerId, onboarding, account.loading])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), toast.undo ? 7000 : 3600)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!isEveningReminderSupported || (account.loading && !ownerId)) return
    const enabled = Boolean(ownerId && state.eveningReminderEnabled)
    let active = true
    async function reconcile() {
      try {
        const result = await restoreEveningReminder(enabled)
        if (active && result === 'permission-denied' && ownerId && ownerId === getAccountSnapshot().user?.id) {
          dispatchAccount(ownerId, { type: 'SET_EVENING_REMINDER', enabled: false })
          setToast({ text: reminderPermissionMessage, ownerId })
        }
      } catch {
        if (active && enabled && ownerId === getAccountSnapshot().user?.id) {
          setToast({ text: '저녁 알림을 확인하지 못했어요.', ownerId })
        }
      }
    }
    void reconcile()
    const listener = NativeApp.addListener('appStateChange', ({ isActive }) => {
      if (active && isActive) void reconcile()
    })
    return () => {
      active = false
      void listener.then((handle) => handle.remove()).catch(() => {})
    }
  }, [account.loading, ownerId, state.eveningReminderEnabled])

  useEffect(() => {
    if (!isEveningReminderSupported) return
    const listener = onEveningReminderTap(() => navigate('home'))
    return () => { void listener.then((handle) => handle.remove()).catch(() => {}) }
  }, [])

  useEffect(() => {
    const title = confirmWithdrawal ? '회원 탈퇴' : starting ? '시작하기' : pageTitle
    document.title = title + ' · ' + appName
  }, [confirmWithdrawal, pageTitle, starting])

  useEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => {
      history.scrollRestoration = previous
    }
  }, [])

  useLayoutEffect(() => {
    const header = masthead.current
    if (!header) return

    const root = document.documentElement
    const measure = () => {
      root.style.setProperty('--app-masthead-height', `${header.getBoundingClientRect().height}px`)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header, { box: 'border-box' })
    return () => {
      observer.disconnect()
      root.style.removeProperty('--app-masthead-height')
    }
  }, [])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const root = document.documentElement
    function updateViewportInsets() {
      if (!viewport) return
      // Some mobile keyboards obscure the visual viewport without resizing the layout.
      const top = viewport.scale === 1 ? Math.max(0, viewport.offsetTop) : 0
      const bottom = viewport.scale === 1 ? Math.max(0, root.clientHeight - viewport.height - top) : 0
      root.style.setProperty('--app-visual-top', `${top}px`)
      root.style.setProperty('--app-visual-bottom', `${bottom}px`)
    }
    updateViewportInsets()
    viewport.addEventListener('resize', updateViewportInsets)
    viewport.addEventListener('scroll', updateViewportInsets)
    window.addEventListener('resize', updateViewportInsets)
    return () => {
      viewport.removeEventListener('resize', updateViewportInsets)
      viewport.removeEventListener('scroll', updateViewportInsets)
      window.removeEventListener('resize', updateViewportInsets)
      root.style.removeProperty('--app-visual-top')
      root.style.removeProperty('--app-visual-bottom')
    }
  }, [])

  function openFromTop(next: Page) {
    positions.current.set(activeScreen, window.scrollY)
    positions.current.delete(next)
    if (next === activeScreen) window.scrollTo(0, 0)
    navigate(next)
  }

  function dispatch(action: AppAction) {
    if (ownerId && getAccountSnapshot().user?.id === ownerId) dispatchAccount(ownerId, action)
  }

  function completeSetup(profile: Profile, goalG: number) {
    if (ownerId) {
      dispatch({ type: 'COMPLETE_SETUP', profile, goalG })
      openFromTop('home')
    } else {
      saveOnboarding({ login: true, setup: { profile, goalG } })
    }
  }

  async function signOut(showLogin = true) {
    if (!ownerId || logoutPending.current) return
    logoutPending.current = true
    setSigningOut(true)
    try {
      await signOutAccount()
      clearPrivateFoodCache(ownerId)
      saveOnboarding({ login: showLogin })
      setToast(null)
      positions.current.clear()
      location.replace('#home')
    } catch {
      setToast({ text: '로그아웃하지 못했어요. 연결을 확인해 주세요.', ownerId })
    } finally {
      logoutPending.current = false
      setSigningOut(false)
    }
  }

  async function add(item: FoodItem, quick: boolean, registering: boolean) {
    if (!ownerId) throw new Error('Sign-in required')
    const record = { ...createRecord(item, quick ? 'quick' : item.kind === 'meal' ? 'estimate' : 'food'), ownerId }
    const { id, name, proteinG, iconId } = item
    if (id.startsWith('custom:') && registering) await savePrivateFood(ownerId, { id, name, proteinG, iconId })
    if (getAccountSnapshot().user?.id !== ownerId) throw new Error('Account changed')
    dispatch({ type: 'ADD_RECORD', record })
    setToast({
      text: item.name + ' ' + item.proteinG + 'g을 기록했어요.',
      undo: { type: 'DELETE_RECORD', recordId: record.id },
      ownerId: record.ownerId,
    })
  }

  async function deleteFood(food: CatalogFood) {
    if (!ownerId) throw new Error('Sign-in required')
    await deletePrivateFood(ownerId, food.id)
    setToast({ text: food.name + '을 음식 목록에서 삭제했어요.', ownerId })
  }

  function change(action: AppAction, message: string) {
    dispatch(action)
    setToast({ text: message, ownerId })
  }

  function handleNavigation(event: MouseEvent<HTMLAnchorElement>, id: Page, mobile = false) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    positions.current.set(activeScreen, window.scrollY)
    if (path === id || (id === 'home' && page === 'home')) {
      event.preventDefault()
      window.scrollTo(0, 0)
    } else if (mobile) {
      setInstantBottomNav(event.detail === 0)
    }
  }

  return (
    <div className="app-shell" data-screen={activeScreen}>
      <a
        className="skip-link"
        href="#app-main"
        onClick={(event) => {
          event.preventDefault()
          main.current?.focus()
        }}
      >
        본문으로 이동
      </a>
      <header className="masthead" ref={masthead}>
        <div className="masthead-inner">
          <a
            className="brand"
            href="#home"
            aria-label={appName + ' 홈'}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              openFromTop('home')
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            {appName}
          </a>
          {appReady && (
            <nav className="desktop-nav" aria-label="주요 메뉴">
              <NavigationLinks page={page} onNavigate={handleNavigation} />
            </nav>
          )}
          <span className="mobile-title" aria-hidden={starting ? undefined : true}>{mobileTitle}</span>
        </div>
        {activeScreen === 'history' && <div className="masthead-content" ref={setCalendarHost} />}
      </header>
      <main className="workspace" id="app-main" tabIndex={-1} ref={main}>
        {saveError && (
          <p className="storage-error" role="alert">
            이 브라우저에 저장할 수 없어요. 창을 닫으면 변경 사항이 사라질 수 있어요.
          </p>
        )}
        <Suspense
          fallback={
            <p className="loading-page" role="status">
              화면을 여는 중…
            </p>
          }
        >
          <PageScroll screen={activeScreen} main={main} positions={positions} />
          {confirmWithdrawal && withdrawalResult ? (
            <WithdrawalConfirmation
              result={withdrawalResult}
              onRetry={setWithdrawalResult}
              onBack={() => {
                setWithdrawalResult(null)
                saveOnboarding({ login: false })
                location.replace('#home')
              }}
            />
          ) : starting && (checkingSession || finishingSetup) ? (
            <p className="loading-page" role="status">로그인 상태를 확인하는 중…</p>
          ) : starting ? (
            <StartScreen
              state={startState}
              stage={ownerId ? 'setup' : onboarding.login ? 'login' : 'welcome'}
              auth={{ available: accountAvailable, loading: account.loading, error: account.error }}
              onComplete={completeSetup}
              onShowLogin={() => saveOnboarding({ ...onboarding, login: true })}
              onBack={() => {
                if (ownerId) void signOut(false)
                else saveOnboarding({ ...onboarding, login: false })
              }}
              onSignIn={signInWithAccountProvider}
            />
          ) : page === 'home' ? (
            <HomePage
              key={ownerId ?? 'device'}
              state={state}
              foods={activeFoods}
              onAdd={(item, registering) => add(item, true, registering)}
              onSaveQuickFoods={(foodIds) =>
                change({ type: 'SET_QUICK_FOODS', foodIds }, '빠른 기록 목록을 저장했어요.')
              }
            />
          ) : page === 'search' ? (
            <LogScreen
              key={ownerId ?? 'device'}
              state={state}
              foods={activeFoods}
              onAdd={(item, registering) => add(item, false, registering)}
              onDeleteFood={deleteFood}
              onToggleFavorite={(foodId) => dispatch({ type: 'TOGGLE_FAVORITE', foodId })}
            />
          ) : page === 'history' ? (
            <HistoryScreen
              key={ownerId ?? 'device'}
              state={state}
              foods={foods}
              calendarHost={calendarHost}
              onUpdate={(recordId, item) =>
                change({ type: 'UPDATE_RECORD', recordId, item }, '섭취 기록을 수정했어요.')
              }
              onDelete={(recordId) => {
                const record = state.records.find((item) => item.id === recordId)
                if (!record) return
                dispatch({ type: 'DELETE_RECORD', recordId })
                setToast({
                  text: record.label + ' 기록을 삭제했어요.',
                  undo: { type: 'ADD_RECORD', record },
                  ownerId,
                })
              }}
              onAdd={() => openFromTop('search')}
            />
          ) : (
            <SettingsScreen
              key={ownerId ?? 'public'}
              state={state}
              detail={settingsDetail}
              onSignOut={() => void signOut()}
              signingOut={signingOut}
              onWithdrawalComplete={setWithdrawalResult}
              onSaveGoal={(profile, goalG) =>
                change(
                  profile ? { type: 'COMPLETE_SETUP', profile, goalG } : { type: 'SET_GOAL', goalG },
                  profile ? '프로필과 목표를 저장했어요.' : '하루 목표를 저장했어요.',
                )
              }
              onSetNotification={(enabled) => dispatch({ type: 'SET_EVENING_REMINDER', enabled })}
            />
          )}
        </Suspense>
      </main>
      {appReady && (
        <BottomNavigation
          page={page}
          instant={instantBottomNav}
          onNavigate={(event, id) => handleNavigation(event, id, true)}
        />
      )}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toast && (!toast.ownerId || toast.ownerId === ownerId) && (
          <div className="app-toast">
            <Check size={17} aria-hidden="true" />
            <span>{toast.text}</span>
            {toast.undo && (
              <button
                onClick={() => {
                  if (toast.undo) change(toast.undo, '이전 상태로 되돌렸어요.')
                }}
              >
                되돌리기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
