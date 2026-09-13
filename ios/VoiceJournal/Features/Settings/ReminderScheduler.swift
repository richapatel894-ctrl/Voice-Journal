import Foundation
import UserNotifications

/// Local notifications only — no backend, no push infrastructure. Matches
/// the requirements doc's own conclusion: a pure PWA can't reliably fire
/// scheduled notifications on iOS, but a native app can do this on-device.
enum ReminderScheduler {
    private static let identifierPrefix = "voicejournal.reminder."

    static func reschedule(enabled: Bool, time: Date, weekdays: Set<Int>) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()
        guard enabled, !weekdays.isEmpty else { return }

        let calendar = Calendar.current
        let timeComponents = calendar.dateComponents([.hour, .minute], from: time)

        for weekday in weekdays {
            var trigger = DateComponents()
            trigger.hour = timeComponents.hour
            trigger.minute = timeComponents.minute
            trigger.weekday = weekday

            let content = UNMutableNotificationContent()
            content.title = "Time to journal"
            content.body = "How was your day? Capture a thought before it slips away."
            content.sound = .default

            let request = UNNotificationRequest(
                identifier: identifierPrefix + "\(weekday)",
                content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: trigger, repeats: true)
            )
            center.add(request)
        }
    }
}
