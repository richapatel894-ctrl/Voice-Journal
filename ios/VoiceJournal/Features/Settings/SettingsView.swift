import SwiftUI
import UserNotifications

private let weekdaySymbols = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

struct SettingsView: View {
    @ObservedObject private var settings = SettingsStore.shared
    @ObservedObject private var store = EntriesStore.shared

    @State private var connectionStatus: String?
    @State private var isTestingConnection = false

    var body: some View {
        NavigationStack {
            Form {
                connectionSection
                reminderSection
                mediaSection
            }
            .navigationTitle("Settings")
        }
    }

    // MARK: - Connection

    private var connectionSection: some View {
        Section {
            TextField("Mac's address, e.g. 192.168.1.42:5050", text: $settings.serverURLString)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .keyboardType(.URL)
            SecureField("API key (from your .env's JOURNAL_API_KEY)", text: $settings.apiKey)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            Button {
                Task { await testConnection() }
            } label: {
                if isTestingConnection {
                    ProgressView()
                } else {
                    Text("Test connection")
                }
            }
            .disabled(!settings.isConfigured || isTestingConnection)

            if let connectionStatus {
                Text(connectionStatus).font(.footnote).foregroundStyle(.secondary)
            }
        } header: {
            Text("Server")
        } footer: {
            Text("Run `node backend/server.js` on your Mac, then enter the “Network” address it prints — the simulator can't reach it via localhost.")
        }
    }

    private func testConnection() async {
        isTestingConnection = true
        defer { isTestingConnection = false }
        do {
            let health = try await APIClient.shared.health()
            connectionStatus = "Connected ✓ — Whisper \(health.whisper ? "on" : "off"), tagging \(health.llm ? "on" : "off")."
            await store.refresh()
        } catch {
            connectionStatus = "Couldn't connect: \(error.localizedDescription)"
        }
    }

    // MARK: - Reminders

    private var reminderSection: some View {
        Section {
            Toggle("Remind me to journal", isOn: $settings.reminderEnabled)
                .onChange(of: settings.reminderEnabled) { _, _ in requestPermissionAndReschedule() }

            if settings.reminderEnabled {
                DatePicker("Time", selection: $settings.reminderTime, displayedComponents: .hourAndMinute)
                    .onChange(of: settings.reminderTime) { _, _ in reschedule() }

                weekdayPicker
            }
        } header: {
            Text("Reminders")
        } footer: {
            Text("A local notification only — nothing leaves your phone, and it works even if your Mac's server is off.")
        }
    }

    private var weekdayPicker: some View {
        HStack(spacing: 6) {
            ForEach(1...7, id: \.self) { weekday in
                let isOn = settings.reminderWeekdays.contains(weekday)
                Button(weekdaySymbols[weekday - 1]) {
                    if isOn {
                        settings.reminderWeekdays.remove(weekday)
                    } else {
                        settings.reminderWeekdays.insert(weekday)
                    }
                    reschedule()
                }
                .font(.caption.weight(.semibold))
                .frame(width: 36, height: 36)
                .background(isOn ? Color.journalPinkDark : Color.gray.opacity(0.15), in: Circle())
                .foregroundStyle(isOn ? .white : .primary)
                .buttonStyle(.plain)
            }
        }
    }

    private func requestPermissionAndReschedule() {
        Task {
            if settings.reminderEnabled {
                _ = try? await UNUserNotificationCenter.current()
                    .requestAuthorization(options: [.alert, .sound, .badge])
            }
            reschedule()
        }
    }

    private func reschedule() {
        ReminderScheduler.reschedule(
            enabled: settings.reminderEnabled,
            time: settings.reminderTime,
            weekdays: settings.reminderWeekdays
        )
    }

    // MARK: - Media library

    private var mediaSection: some View {
        Section("Media") {
            if allMedia.isEmpty {
                Text("Photos, files, and links you attach to entries show up here.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 64, maximum: 64))], spacing: 8) {
                    ForEach(allMedia, id: \.self) { raw in
                        switch MediaItem.classify(raw) {
                        case .image(let filename):
                            RemoteImageView(filename: filename)
                                .frame(width: 64, height: 64)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        case .file:
                            Image(systemName: "doc.fill")
                                .frame(width: 64, height: 64)
                                .background(.gray.opacity(0.15), in: RoundedRectangle(cornerRadius: 8))
                        case .link(let url):
                            Link(destination: URL(string: url) ?? URL(string: "about:blank")!) {
                                Image(systemName: "link")
                                    .frame(width: 64, height: 64)
                                    .background(.blue.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                            }
                        }
                    }
                }
            }
        }
    }

    private var allMedia: [String] {
        store.entries.flatMap(\.media)
    }
}
