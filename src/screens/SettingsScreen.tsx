import { useLayoutEffect, useRef, type MouseEvent } from 'react'
import { ChevronRight, CircleHelp, FileText, Info, LogOut, Pencil, ShieldCheck, UserRoundX } from 'lucide-react'
import type { AppState, Profile } from '../app/model'
import { EveningReminderSetting } from '../components/EveningReminderSetting'
import { AccountWithdrawal, type WithdrawalResult } from './AccountWithdrawal'
import { SettingsInformation } from './SettingsInformation'
import { GoalSetupScreen } from './StartScreen'
import './settings.css'

const informationLinks = [
  { id: 'privacy', label: '개인정보 처리방침', icon: ShieldCheck },
  { id: 'terms', label: '서비스 이용약관', icon: FileText },
  { id: 'app-info', label: '앱 정보', icon: Info },
] as const

interface SettingsScreenProps {
  state: AppState
  detail?: string
  onSignOut: () => void
  signingOut: boolean
  onWithdrawalComplete: (result: WithdrawalResult) => void
  onSaveGoal: (profile: Profile | undefined, grams: number) => void
  onSetNotification: (enabled: boolean) => void
}

export function SettingsScreen({
  state,
  detail,
  onSignOut,
  signingOut,
  onWithdrawalComplete,
  onSaveGoal,
  onSetNotification,
}: SettingsScreenProps) {
  const detailOrigin = useRef<{ id: string; scroll: number } | null>(null)
  const purpose = { balance: '균형 유지', muscle: '근육 성장', diet: '체중 관리' }[state.profile.purpose]
  const sex = state.profile.sex === 'male' ? '남성' : state.profile.sex === 'female' ? '여성' : '선택 안 함'
  const editingProfile = detail === 'edit'
  const informationPage = detail === 'help' || detail === 'privacy' || detail === 'terms'
    || detail === 'app-info' || detail === 'account-deletion'
  const showingDetail = editingProfile || informationPage || detail === 'withdrawal'

  useLayoutEffect(() => {
    if (!showingDetail && detailOrigin.current) {
      const { id, scroll } = detailOrigin.current
      detailOrigin.current = null
      window.scrollTo(0, scroll)
      document.getElementById(id)?.focus({ preventScroll: true })
    }
  }, [showingDetail])

  function openDetail(hash: string) {
    location.hash = hash
    history.replaceState({ ...history.state, settingsBack: true }, '')
  }

  function rememberDetailOrigin(event: MouseEvent<HTMLAnchorElement>) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    detailOrigin.current = { id: event.currentTarget.id, scroll: window.scrollY }
    openDetail(event.currentTarget.hash)
  }

  function closeDetail() {
    if (history.state?.settingsBack === true) history.back()
    else location.replace('#profile')
  }

  function closeProfileEditor() {
    detailOrigin.current ??= { id: 'settings-profile-edit', scroll: 0 }
    closeDetail()
  }

  function saveProfileAndGoal(profile: Profile | undefined, goal: number) {
    onSaveGoal(profile, goal)
    closeProfileEditor()
  }

  if (informationPage) {
    return (
      <SettingsInformation
        page={detail}
        onBack={closeDetail}
        onNavigate={(page) => openDetail(`#profile/${page}`)}
      />
    )
  }

  if (detail === 'withdrawal') {
    return <AccountWithdrawal onBack={closeDetail} onComplete={onWithdrawalComplete} />
  }

  if (editingProfile) {
    return (
      <GoalSetupScreen
        className="settings-screen"
        backLabel="설정으로 돌아가기"
        profile={state.profileConfigured ? state.profile : undefined}
        goal={state.goalG}
        submitLabel="변경 저장"
        onSave={saveProfileAndGoal}
        onSaveGoalOnly={(goal) => saveProfileAndGoal(undefined, goal)}
        onCancel={closeProfileEditor}
      />
    )
  }

  return (
    <section className="settings-screen" aria-labelledby="settings-title">
      <header className="page-header">
        <h1 className="page-title" id="settings-title">
          내 설정
        </h1>
      </header>
      <section className="settings-card panel" aria-labelledby="profile-title">
        <div className="settings-card-heading">
          <h2 id="profile-title">내 프로필</h2>
          <a
            id="settings-profile-edit"
            href="#profile/edit"
            className="settings-edit-button"
            aria-label="프로필과 목표 수정"
            onClick={rememberDetailOrigin}
          >
            <Pencil size={18} aria-hidden="true" />
          </a>
        </div>
        <dl className="personal-facts">
          <div className="settings-goal-fact">
            <dt>하루 단백질 목표</dt>
            <dd>{state.goalG} g</dd>
          </div>
          {state.profileConfigured && (
            <>
              <div>
                <dt>관리 목적</dt>
                <dd>{purpose}</dd>
              </div>
              <div>
                <dt>성별</dt>
                <dd>{sex}</dd>
              </div>
              <div>
                <dt>키</dt>
                <dd>{state.profile.heightCm} cm</dd>
              </div>
              <div>
                <dt>몸무게</dt>
                <dd>{state.profile.weightKg} kg</dd>
              </div>
            </>
          )}
        </dl>
        {!state.profileConfigured && (
          <p className="profile-empty">
            프로필을 입력하면 하루 목표와 한 끼 분량을 계산하는 데 사용해요.
          </p>
        )}
      </section>
      <EveningReminderSetting enabled={state.eveningReminderEnabled} onChange={onSetNotification} />
      <section aria-labelledby="support-title" className="settings-group">
        <h2 id="support-title">지원</h2>
        <div className="settings-list panel">
          <a id="settings-help" className="settings-row settings-link" href="#profile/help" onClick={rememberDetailOrigin}>
            <CircleHelp size={19} aria-hidden="true" />
            <strong>도움말</strong>
            <ChevronRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section aria-labelledby="information-title" className="settings-group">
        <h2 id="information-title">약관 및 앱 정보</h2>
        <div className="settings-list panel">
          {informationLinks.map(({ id, label, icon: Icon }) => (
            <a key={id} id={`settings-${id}`} className="settings-row settings-link" href={`#profile/${id}`} onClick={rememberDetailOrigin}>
              <Icon size={19} aria-hidden="true" />
              <strong>{label}</strong>
              <ChevronRight size={18} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>
      <section aria-labelledby="account-title" className="settings-group">
        <h2 id="account-title">계정</h2>
        <div className="settings-list panel">
          <button
            type="button"
            className="settings-row settings-link settings-account-action"
            disabled={signingOut}
            onClick={onSignOut}
          >
            <LogOut size={19} aria-hidden="true" />
            <strong>{signingOut ? '로그아웃 중…' : '로그아웃'}</strong>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          <a id="settings-withdrawal" className="settings-row settings-link settings-withdrawal" href="#profile/withdrawal" onClick={rememberDetailOrigin}>
            <UserRoundX size={19} aria-hidden="true" />
            <strong>회원 탈퇴</strong>
            <ChevronRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
    </section>
  )
}
