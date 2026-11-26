import { useRef, useState } from 'react'
import { Switch } from '@astryxdesign/core/Switch'
import { Bell } from 'lucide-react'
import { eveningReminderHour, isEveningReminderSupported, reminderPermissionMessage, setEveningReminder } from '../app/reminder'

const reminderTime = `오후 ${eveningReminderHour - 12}시쯤`

export function EveningReminderSetting({
  enabled,
  onChange,
}: {
  enabled: boolean
  onChange: (enabled: boolean) => void
}) {
  const pending = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const description = isEveningReminderSupported
    ? `매일 ${reminderTime} 오늘의 단백질 기록을 확인하도록 알려드려요.`
    : `iOS·Android 앱에서 매일 ${reminderTime} 받을 수 있어요.`

  async function changeReminder(next: boolean) {
    if (!isEveningReminderSupported || pending.current) return

    pending.current = true
    setBusy(true)
    setError('')
    try {
      const result = await setEveningReminder(next)
      if (result === 'updated') onChange(next)
      else setError(reminderPermissionMessage)
    } catch {
      setError('알림 설정을 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="notification-title" className="settings-group">
      <h2 id="notification-title">알림</h2>
      <div className="settings-list panel">
        <div className="settings-row">
          <Bell size={19} aria-hidden="true" />
          <div className="settings-row-copy">
            <h3>저녁 기록 알림</h3>
            <p id="reminder-description">{description}</p>
            {error && <p role="alert">{error}</p>}
          </div>
          <Switch
            className="settings-switch"
            label="저녁 기록 알림"
            isLabelHidden
            isDisabled={!isEveningReminderSupported || busy}
            aria-describedby="reminder-description"
            value={isEveningReminderSupported && enabled}
            onChange={(next) => void changeReminder(next)}
          />
        </div>
      </div>
    </section>
  )
}
