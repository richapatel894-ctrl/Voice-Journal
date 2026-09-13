import SwiftUI

/// Home deliberately shows only today's entries — not an infinite feed —
/// per the requirements doc.
struct HomeView: View {
    @ObservedObject private var store = EntriesStore.shared
    @ObservedObject private var settings = SettingsStore.shared

    @State private var showComposer = false
    @State private var composerKind: EntryKind = .text
    @State private var editingEntry: Entry?
    @State private var toastMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if !settings.isConfigured {
                        connectionWarning
                    }
                    StreakStripView(streak: store.currentStreak)
                    greeting
                    ctaButtons
                    if !store.todaysEntries.isEmpty {
                        todaySection
                    } else if !store.isLoading {
                        Text("Nothing yet today. Speak or write your first thought.")
                            .foregroundStyle(.secondary)
                            .font(.callout)
                    }
                }
                .padding()
            }
            .background(Color.journalPink.opacity(0.12))
            .navigationTitle("Voice Journal")
            .task { await store.refresh() }
            .refreshable { await store.refresh() }
            .overlay(alignment: .top) {
                if let toastMessage {
                    ToastView(message: toastMessage)
                        .padding(.top, 8)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .sheet(isPresented: $showComposer) {
                ComposerView(kind: composerKind) { saved in
                    store.addEntry(saved)
                    showToast("Saved ✓")
                }
            }
            .sheet(item: $editingEntry) { entry in
                ComposerView(existing: entry) { updated in
                    store.replace(updated)
                }
            }
        }
    }

    private var connectionWarning: some View {
        Label("Set your server address in Settings to start journaling.", systemImage: "wifi.exclamationmark")
            .font(.footnote)
            .padding(10)
            .background(.yellow.opacity(0.25), in: RoundedRectangle(cornerRadius: 10))
    }

    private var greeting: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(greetingText).font(.largeTitle.bold())
            Text("How are you feeling today?").foregroundStyle(.secondary)
        }
    }

    private var greetingText: String {
        switch Calendar.current.component(.hour, from: Date()) {
        case 0..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        default: return "Good evening"
        }
    }

    private var ctaButtons: some View {
        HStack(spacing: 12) {
            Button {
                composerKind = .voice
                showComposer = true
            } label: {
                Label("Record", systemImage: "mic.fill").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(Color.journalPinkDark)

            Button {
                composerKind = .text
                showComposer = true
            } label: {
                Label("Write", systemImage: "square.and.pencil").frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
        }
        .disabled(!settings.isConfigured)
    }

    private var todaySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Today").font(.headline)
            ForEach(store.todaysEntries) { entry in
                EntryCardView(
                    entry: entry,
                    onEdit: { editingEntry = entry },
                    onDelete: { Task { await delete(entry) } }
                )
            }
        }
    }

    private func delete(_ entry: Entry) async {
        do {
            try await APIClient.shared.deleteEntry(id: entry.id)
            store.remove(id: entry.id)
        } catch {
            store.lastError = error.localizedDescription
        }
    }

    private func showToast(_ message: String) {
        withAnimation { toastMessage = message }
        Task {
            try? await Task.sleep(for: .seconds(2))
            withAnimation { toastMessage = nil }
        }
    }
}
