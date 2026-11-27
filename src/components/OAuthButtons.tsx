import googleLogo from '../assets/auth/google-g.png'
import './oauth-buttons.css'

interface OAuthButtonsProps {
  disabled: boolean
  onSignIn: () => void
}

export function OAuthButtons({ disabled, onSignIn }: OAuthButtonsProps) {
  return (
    <button className="oauth-button" type="button" disabled={disabled} onClick={onSignIn}>
      <img className="oauth-button__google-icon" src={googleLogo} alt="" width={20} height={20} draggable={false} />
      Google 계정으로 계속
    </button>
  )
}
