import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'

export const eveningReminderHour = 20
export const isEveningReminderSupported = Capacitor.isNativePlatform()
  && Capacitor.isPluginAvailable('LocalNotifications')

const reminderId = 2000
const channelId = 'evening-intake-reminder'
const title = '저녁 단백질 기록 알림'
export const reminderPermissionMessage = Capacitor.getPlatform() === 'android'
  ? '기기 설정에서 앱 알림과 ‘저녁 단백질 기록 알림’을 허용해 주세요.'
  : '기기 설정에서 이 앱의 알림을 허용해 주세요.'
type ReminderUpdate = 'updated' | 'permission-denied'

let reminderQueue: Promise<unknown> = Promise.resolve()

function enqueue<T>(operation: () => Promise<T>) {
  const result = reminderQueue.then(operation, operation)
  reminderQueue = result
  return result
}

async function canDeliver(requestPermission: boolean) {
  let { display } = await LocalNotifications.checkPermissions()
  if (requestPermission && (display === 'prompt' || display === 'prompt-with-rationale')) {
    display = (await LocalNotifications.requestPermissions()).display
  }
  if (display !== 'granted') return false
  if (Capacitor.getPlatform() !== 'android') return true

  // Android 7 supports notifications but has no notification channels.
  const { androidSDKVersion } = await Device.getInfo()
  if (androidSDKVersion !== undefined && androidSDKVersion >= 26) {
    await LocalNotifications.createChannel({ id: channelId, name: title, importance: 3 })
    const { channels } = await LocalNotifications.listChannels()
    return channels.some((channel) => channel.id === channelId && channel.importance !== 0)
  }
  return true
}

async function scheduleReminder() {
  const { notifications } = await LocalNotifications.schedule({
    notifications: [
      {
        id: reminderId,
        channelId,
        title,
        smallIcon: 'ic_stat_shaker',
        body: '오늘 섭취한 단백질을 확인해 보세요.',
        schedule: { on: { hour: eveningReminderHour, minute: 0, second: 0 }, allowWhileIdle: true },
        isExactNotification: false,
      },
    ],
  })

  if (!notifications.some(({ id }) => id === reminderId)) throw new Error('Evening reminder was not scheduled')
}

async function cancelReminder() {
  await LocalNotifications.cancel({ notifications: [{ id: reminderId }] })
  await LocalNotifications.removeDeliveredNotificationsById({ ids: [reminderId] })
}

export function setEveningReminder(enabled: boolean): Promise<ReminderUpdate> {
  return enqueue(async () => {
    if (!isEveningReminderSupported) throw new Error('Evening reminders require the native app')

    if (!enabled) {
      await cancelReminder()
      return 'updated'
    }

    if (!await canDeliver(true)) return 'permission-denied'
    await scheduleReminder()
    return 'updated'
  })
}

export function restoreEveningReminder(enabled: boolean): Promise<ReminderUpdate> {
  if (!isEveningReminderSupported) return Promise.resolve('updated')

  return enqueue(async () => {
    if (!enabled) {
      await cancelReminder()
      return 'updated'
    }
    if (!await canDeliver(false)) {
      await cancelReminder()
      return 'permission-denied'
    }
    const { notifications } = await LocalNotifications.getAll({ state: 'SCHEDULED' })
    if (!notifications.some(({ id }) => id === reminderId)) await scheduleReminder()
    return 'updated'
  })
}

export function onEveningReminderTap(openHome: () => void) {
  return LocalNotifications.addListener('localNotificationActionPerformed', ({ notification, actionId }) => {
    if (notification.id === reminderId && actionId === 'tap') openHome()
  })
}
