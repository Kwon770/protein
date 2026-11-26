import { useId, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { AccountProvider } from '../app/account'
import { appName } from '../app/branding'
import { recommendGoal, type AppState, type Profile, type ProfileSex, type Purpose } from '../app/model'
import { OAuthButtons } from '../components/OAuthButtons'
import { ProteinShaker } from '../components/ProteinShaker'
import './start.css'

const purposes: { value: Purpose; label: string }[] = [
  { value: 'balance', label: '균형 유지' },
  { value: 'muscle', label: '근육 성장' },
  { value: 'diet', label: '체중 관리' },
]
const sexOptions: { value: ProfileSex | ''; label: string }[] = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: '', label: '선택 안 함' },
]

interface ProfileFormProps {
  profile?: Profile
  goal?: number
  submitLabel?: string
  onSave: (profile: Profile, goal: number) => void
  onSaveGoalOnly?: (goal: number) => void
  onCancel?: () => void
}

function ProfileForm({
  profile,
  goal,
  submitLabel = goal === undefined ? '프로필 저장' : '저장하고 시작하기',
  onSave,
  onSaveGoalOnly,
  onCancel,
}: ProfileFormProps) {
  const [initialProfile] = useState(profile)
  const [height, setHeight] = useState(String(profile?.heightCm ?? ''))
  const [weight, setWeight] = useState(String(profile?.weightKg ?? ''))
  const [sex, setSex] = useState<ProfileSex | ''>(profile?.sex ?? '')
  const [purpose, setPurpose] = useState<Purpose>(profile?.purpose ?? 'balance')
  const [goalDraft, setGoalDraft] = useState(String(goal ?? ''))
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const errorId = useId()
  const recommendationId = useId()
  const draft = { heightCm: Number(height), weightKg: Number(weight), sex: sex || null, purpose }
  const requiresProfile = !onSaveGoalOnly || Boolean(initialProfile || height || weight || sex || purpose !== 'balance')
  const minimumHeight = Math.min(120, initialProfile?.heightCm ?? 120)
  const maximumHeight = Math.max(230, initialProfile?.heightCm ?? 230)
  const minimumWeight = Math.min(30, initialProfile?.weightKg ?? 30)
  const maximumWeight = Math.max(250, initialProfile?.weightKg ?? 250)
  const reference = recommendGoal(draft)
  const validWeight = reference > 0 && draft.weightKg >= minimumWeight && draft.weightKg <= maximumWeight
  const matchesRecommendation = validWeight && Number(goalDraft) === reference
  const purposeLabel = purposes.find((option) => option.value === purpose)?.label
  const minimumGoal = Math.min(20, goal ?? 20)
  const maximumGoal = Math.max(300, goal ?? 0, reference)

  function clearError(name: string) {
    setInvalidFields((fields) => fields.filter((field) => field !== name))
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const invalidInputs = Array.from(
      event.currentTarget.querySelectorAll<HTMLInputElement>('input:invalid'),
    )
    if (invalidInputs.length) {
      setInvalidFields(invalidInputs.map((input) => input.name))
      invalidInputs[0].focus()
      return
    }
    const profileUnchanged =
      draft.heightCm === initialProfile?.heightCm &&
      draft.weightKg === initialProfile?.weightKg &&
      draft.sex === (initialProfile?.sex ?? null) &&
      draft.purpose === initialProfile?.purpose
    if (onSaveGoalOnly && (!requiresProfile || profileUnchanged)) {
      onSaveGoalOnly(Number(goalDraft))
    } else {
      onSave(draft, Number(goalDraft))
    }
  }

  const heightInvalid = requiresProfile && invalidFields.includes('height')
  const weightInvalid = requiresProfile && invalidFields.includes('weight')
  const goalInvalid = invalidFields.includes('goal')

  return (
    <form className="profile-form" noValidate onSubmit={save}>
      <fieldset className="profile-purpose">
        <legend>성별</legend>
        <div>
          {sexOptions.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="sex"
                value={option.value}
                checked={option.value === sex}
                onChange={() => setSex(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="profile-pair">
        <label className="profile-field">
          키
          <span className="profile-number">
            <input
              name="height"
              type="number"
              inputMode="decimal"
              step="any"
              min={minimumHeight}
              max={maximumHeight}
              value={height}
              onChange={(event) => {
                setHeight(event.target.value)
                clearError('height')
              }}
              required={requiresProfile}
              aria-label="키 (cm)"
              aria-invalid={heightInvalid || undefined}
              aria-describedby={heightInvalid ? errorId + '-height' : undefined}
            />
            <span>cm</span>
          </span>
          {heightInvalid && (
            <span id={errorId + '-height'} className="profile-field-error" role="alert">
              {minimumHeight}~{maximumHeight}cm 사이로 입력해 주세요.
            </span>
          )}
        </label>
        <label className="profile-field">
          몸무게
          <span className="profile-number">
            <input
              name="weight"
              type="number"
              inputMode="decimal"
              step="any"
              min={minimumWeight}
              max={maximumWeight}
              value={weight}
              onChange={(event) => {
                setWeight(event.target.value)
                clearError('weight')
              }}
              required={requiresProfile}
              aria-label="몸무게 (kg)"
              aria-invalid={weightInvalid || undefined}
              aria-describedby={weightInvalid ? errorId + '-weight' : undefined}
            />
            <span>kg</span>
          </span>
          {weightInvalid && (
            <span id={errorId + '-weight'} className="profile-field-error" role="alert">
              {minimumWeight}~{maximumWeight}kg 사이로 입력해 주세요.
            </span>
          )}
        </label>
      </div>
      <fieldset className="profile-purpose">
        <legend>관리 목적</legend>
        <div>
          {purposes.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name="purpose"
                value={option.value}
                checked={option.value === purpose}
                onChange={() => setPurpose(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {goal !== undefined && (
        <>
          <section className="profile-recommendation" aria-labelledby={recommendationId}>
            <div>
              <h2 id={recommendationId}>프로필 기반 하루 단백질 추천량</h2>
              {validWeight ? (
                <>
                  <output className="profile-recommendation-amount">
                    <strong>{reference}</strong> <span>g</span>
                  </output>
                  <p>몸무게 {draft.weightKg}kg · {purposeLabel} 기준</p>
                </>
              ) : (
                <p>몸무게를 입력하면 관리 목적에 맞춰 추천량을 계산해요.</p>
              )}
            </div>
            {validWeight && (
              <Button
                className="reference-button"
                label={matchesRecommendation ? '목표와 일치' : '목표에 적용'}
                variant="secondary"
                type="button"
                icon={matchesRecommendation ? <Check size={16} /> : undefined}
                isDisabled={matchesRecommendation}
                onClick={() => {
                  setGoalDraft(String(reference))
                  clearError('goal')
                }}
              />
            )}
          </section>
          <label className="profile-field">
            하루 단백질 목표
            <span className="profile-number">
              <input
                name="goal"
                type="number"
                inputMode="numeric"
                min={minimumGoal}
                max={maximumGoal}
                value={goalDraft}
                onChange={(event) => {
                  setGoalDraft(event.target.value)
                  clearError('goal')
                }}
                required
                aria-label="하루 단백질 목표 (g)"
                aria-invalid={goalInvalid || undefined}
                aria-describedby={goalInvalid ? errorId + '-goal' : undefined}
              />
              <span>g</span>
            </span>
            {goalInvalid && (
              <span id={errorId + '-goal'} className="profile-field-error" role="alert">
                {minimumGoal}~{maximumGoal}g 사이의 정수를 입력해 주세요.
              </span>
            )}
          </label>
        </>
      )}
      <div className="profile-actions">
        {onCancel && <Button className="setting-button" label="취소" onClick={onCancel} />}
        <Button
          className="setting-button strong-action"
          label={submitLabel}
          variant="primary"
          type="submit"
          width={onCancel ? undefined : '100%'}
        />
      </div>
    </form>
  )
}

interface StartScreenProps {
  state: AppState
  stage: 'welcome' | 'setup' | 'login'
  auth: { loading: boolean; error: string | null; available: boolean }
  onComplete: (profile: Profile, goal: number) => void
  onShowLogin: () => void
  onBack: () => void
  onSignIn: (provider: AccountProvider) => Promise<void>
}

interface GoalSetupScreenProps extends ProfileFormProps {
  goal: number
  backLabel: string
  onCancel: () => void
  className?: string
}

export function GoalSetupScreen({ backLabel, className, ...formProps }: GoalSetupScreenProps) {
  const titleId = useId()
  const title = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    title.current?.focus({ preventScroll: true })
  }, [])

  return (
    <section className={className ? `start-screen ${className}` : 'start-screen'} aria-labelledby={titleId} data-editing>
      <div className="start-card panel">
        <div className="goal-setup-heading">
          <Button
            label={backLabel}
            icon={<ArrowLeft size={18} />}
            className="start-back"
            data-android-back
            variant="ghost"
            isIconOnly
            onClick={formProps.onCancel}
          />
          <h1 id={titleId} ref={title} tabIndex={-1}>
            프로필과 목표 설정
          </h1>
        </div>
        <ProfileForm {...formProps} />
      </div>
    </section>
  )
}

export function StartScreen({ state, stage, auth, onComplete, onShowLogin, onBack, onSignIn }: StartScreenProps) {
  const [editing, setEditing] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [failed, setFailed] = useState(false)
  const title = useRef<HTMLHeadingElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const screen = stage === 'welcome' && editing ? 'setup' : stage
  const authenticatedSetup = stage === 'setup'
  const pending = requesting || auth.loading
  const authError = auth.error ?? (failed ? '로그인을 시작하지 못했어요. 다시 시도해 주세요.' : null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    title.current?.focus({ preventScroll: true })
  }, [screen])

  function goBack() {
    setEditing(false)
    setFailed(false)
    if (screen === 'setup' && !authenticatedSetup) {
      requestAnimationFrame(() => editButton.current?.focus({ preventScroll: true }))
      return
    }
    onBack()
  }

  async function signIn(provider: AccountProvider) {
    if (pending || !auth.available) return
    setFailed(false)
    setRequesting(true)
    try {
      await onSignIn(provider)
    } catch {
      setFailed(true)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <section className="onboarding-screen" data-stage={screen} aria-labelledby="onboarding-title">
      <div className="onboarding-top">
        {screen === 'welcome' ? (
          <div className="brand onboarding-brand">
            <span className="brand-mark" aria-hidden="true"><span /></span>
            {appName}
          </div>
        ) : (
          <Button
            label={authenticatedSetup ? '로그아웃하고 시작 화면으로 돌아가기' : '시작 화면으로 돌아가기'}
            icon={<ArrowLeft size={22} />}
            className="onboarding-back"
            data-android-back
            variant="ghost"
            isIconOnly
            isDisabled={pending}
            onClick={goBack}
          />
        )}
      </div>

      <header className="onboarding-heading">
        <h1 id="onboarding-title" ref={title} tabIndex={-1}>
          {screen === 'welcome' && <>단백질 기록<br />시작하기</>}
          {screen === 'setup' && '프로필과 목표 설정'}
          {screen === 'login' && '계정으로 시작하기'}
        </h1>
        {screen === 'welcome' && <p>하루 목표를 정하고 먹은 음식의 단백질을 기록해 보세요.</p>}
      </header>

      {screen === 'setup' && (
        <ProfileForm
          profile={state.profileConfigured ? state.profile : undefined}
          goal={state.goalG}
          submitLabel={authenticatedSetup ? '저장하고 시작하기' : '로그인으로 계속'}
          onSave={onComplete}
        />
      )}

      {screen !== 'setup' && (
        <div className="onboarding-illustration" aria-hidden="true">
          <div className="onboarding-shaker">
            <ProteinShaker value={72} max={100} />
          </div>
        </div>
      )}

      {screen === 'welcome' && (
        <div className="onboarding-actions">
          <Button
            ref={editButton}
            label="목표 설정하기"
            width="100%"
            variant="primary"
            className="setting-button strong-action"
            endContent={<ArrowRight size={18} />}
            onClick={() => setEditing(true)}
          />
          <Button
            label="이미 계정이 있어요"
            variant="ghost"
            width="100%"
            className="setting-button"
            onClick={onShowLogin}
          />
        </div>
      )}

      {screen === 'login' && (
        <div className="onboarding-actions">
          {pending && <p className="start-auth-status" role="status">로그인 상태를 확인하고 있어요.</p>}
          {!pending && (!auth.available || authError) && (
            <p className="start-auth-status profile-field-error" role="alert">
              {authError ?? '현재 이 환경에서 로그인할 수 없어요.'}
            </p>
          )}
          {auth.available && <OAuthButtons disabled={pending} onSignIn={(provider) => void signIn(provider)} />}
          <div className="start-legal">
            <a href="#profile/terms">서비스 이용약관</a>
            <a href="#profile/privacy">개인정보 처리방침</a>
          </div>
        </div>
      )}
    </section>
  )
}
