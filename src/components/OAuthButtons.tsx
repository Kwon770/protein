import { useEffect, useState } from 'react'
import { Button } from '@astryxdesign/core/Button'
import { getAccountProviders, type AccountProvider } from '../app/account'
import appleButton from '../assets/auth/apple-continue-ko.png'
import googleLogo from '../assets/auth/google-g.png'
import './oauth-buttons.css'

interface OAuthButtonsProps {
  disabled: boolean
  onSignIn: (provider: AccountProvider) => void
}

export function OAuthButtons({ disabled, onSignIn }: OAuthButtonsProps) {
  const [providers, setProviders] = useState<AccountProvider[] | 'failed' | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    const timeout = window.setTimeout(() => controller.abort(), 8000)
    void getAccountProviders(controller.signal)
      .then((available) => { if (active) setProviders(available) })
      .catch(() => { if (active) setProviders('failed') })
      .finally(() => window.clearTimeout(timeout))
    return () => {
      active = false
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [attempt])

  if (providers === null) {
    return <p className="start-auth-status" role="status">로그인 방법을 확인하고 있어요.</p>
  }
  if (providers === 'failed' || !providers.length) {
    return (
      <div className="oauth-buttons">
        <p className="start-auth-status" role="status">
          {providers === 'failed'
            ? '로그인 방법을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'
            : '지금은 사용할 수 있는 로그인 방법이 없어요. 잠시 후 다시 시도해 주세요.'}
        </p>
        <Button
          label="다시 확인"
          variant="secondary"
          isDisabled={disabled}
          onClick={() => { setProviders(null); setAttempt((count) => count + 1) }}
        />
      </div>
    )
  }

  return (
    <div className="oauth-buttons">
      {providers.includes('google') && <button
        className="oauth-button oauth-button--google"
        type="button"
        disabled={disabled}
        onClick={() => onSignIn('google')}
      >
        <img className="oauth-button__google-icon" src={googleLogo} alt="" width={20} height={20} draggable={false} />
        Google 계정으로 계속
      </button>}
      {providers.includes('apple') && <button
        className="oauth-button oauth-button--apple"
        type="button"
        disabled={disabled}
        aria-label="Apple로 계속하기"
        onClick={() => onSignIn('apple')}
      >
        <img src={appleButton} alt="" width={320} height={44} draggable={false} />
      </button>}
    </div>
  )
}
