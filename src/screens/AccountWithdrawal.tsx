import { useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AlertDialog } from '@astryxdesign/core/AlertDialog'
import { Button } from '@astryxdesign/core/Button'
import { ArrowLeft } from 'lucide-react'
import { getAccountSnapshot, subscribeAccount, withdrawAccount } from '../app/account'
import { appName } from '../app/branding'
import { clearPrivateFoodCache } from '../app/private-foods'
import { clearAfterWithdrawal } from '../app/storage'
import './settings.css'

export type WithdrawalResult = {
  userId: string
  appleRevocationRequired: boolean
  localDataCleared: boolean
}

function WithdrawalPage({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const title = useRef<HTMLHeadingElement>(null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    title.current?.focus({ preventScroll: true })
  }, [])

  return (
    <section className="settings-screen withdrawal-screen" aria-labelledby="withdrawal-title">
      <header className="withdrawal-header">
        <Button label="뒤로 가기" data-android-back variant="ghost" icon={<ArrowLeft size={18} />} isIconOnly onClick={onBack} />
        <h1 className="withdrawal-title" id="withdrawal-title" ref={title} tabIndex={-1}>회원 탈퇴</h1>
      </header>
      <div className="settings-card panel withdrawal-notice">{children}</div>
    </section>
  )
}

export function WithdrawalConfirmation({
  result,
  onRetry,
  onBack,
}: {
  result: WithdrawalResult
  onRetry: (result: WithdrawalResult) => void
  onBack: () => void
}) {
  return (
    <WithdrawalPage onBack={onBack}>
      <h2 role="status">회원 탈퇴를 완료했어요</h2>
      {result.localDataCleared ? <p>{appName} 계정과 이 기기의 개인 기록을 삭제했어요.</p> : (
        <>
          <p>계정은 삭제됐어요. 이 기기의 개인 기록을 지우려면 다시 시도해 주세요.</p>
          <Button
            className="withdrawal-action"
            label="다시 시도"
            onClick={() => onRetry({ ...result, localDataCleared: clearAfterWithdrawal(result.userId) })}
          />
        </>
      )}
      {result.appleRevocationRequired && (
        <p>
          Apple로 로그인한 적이 있다면 Apple 계정에서 {appName}의 로그인 연결을 해제해 주세요.{' '}
          <a href="https://support.apple.com/ko-kr/102571" target="_blank" rel="noreferrer">Apple 로그인 연결 해제 방법</a>
        </p>
      )}
      <Button className="withdrawal-action" label="시작 화면으로" onClick={onBack} />
    </WithdrawalPage>
  )
}

export function AccountWithdrawal({
  onBack,
  onComplete,
}: {
  onBack: () => void
  onComplete: (result: WithdrawalResult) => void
}) {
  const { user } = useSyncExternalStore(subscribeAccount, getAccountSnapshot)
  const withdrawalButton = useRef<HTMLButtonElement>(null)
  const inFlight = useRef(false)
  const [confirmingUser, setConfirmingUser] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  function closeConfirmation() {
    setConfirmingUser(null)
    requestAnimationFrame(() => withdrawalButton.current?.focus({ preventScroll: true }))
  }

  async function deleteAccount() {
    if (inFlight.current || !confirmingUser) return
    inFlight.current = true
    setDeleting(true)
    setError('')
    try {
      const { appleRevocationRequired } = await withdrawAccount(confirmingUser)
      clearPrivateFoodCache(confirmingUser)
      onComplete({
        userId: confirmingUser,
        appleRevocationRequired,
        localDataCleared: clearAfterWithdrawal(confirmingUser),
      })
    } catch {
      setError('탈퇴를 완료하지 못했어요. 로그인 상태와 인터넷 연결을 확인한 뒤 다시 시도해 주세요.')
    } finally {
      inFlight.current = false
      setDeleting(false)
      closeConfirmation()
    }
  }

  return (
    <WithdrawalPage onBack={onBack}>
      {user && (
        <>
          <h2>{appName} 계정을 삭제할까요?</h2>
          {user.email && <p>{user.email}</p>}
          <p>탈퇴하면 계정과 이 기기에 저장된 해당 계정의 섭취 기록, 프로필, 목표, 설정이 삭제돼요.</p>
          <Button
            ref={withdrawalButton}
            className="withdrawal-action"
            label="회원 탈퇴"
            variant="destructive"
            onClick={() => setConfirmingUser(user.id)}
          />
        </>
      )}
      {error && (
        <>
          <p role="alert">{error}</p>
          <p><a href="#profile/account-deletion">이메일로 계정 삭제 요청하기</a></p>
        </>
      )}
      {confirmingUser && (
        <AlertDialog
          isOpen
          title="정말 회원 탈퇴할까요?"
          description={appName + ' 계정과 이 기기에 저장된 해당 계정의 기록과 설정이 삭제돼요. 삭제한 데이터는 복구할 수 없어요.'}
          cancelLabel="취소"
          actionLabel="탈퇴하기"
          isActionLoading={deleting}
          onOpenChange={(open) => {
            if (!open && !inFlight.current) closeConfirmation()
          }}
          onAction={deleteAccount}
        />
      )}
    </WithdrawalPage>
  )
}
