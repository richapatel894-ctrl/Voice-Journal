import Foundation

/// Entries are the single source of truth (requirements doc, Key Decision 1) —
/// Home, Entries, and Insights all read from this one store so an edit or
/// delete made anywhere stays in sync everywhere.
@MainActor
final class EntriesStore: ObservableObject {
    static let shared = EntriesStore()

    @Published var entries: [Entry] = []
    @Published var isLoading = false
    @Published var lastError: String?

    private init() {}

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            entries = try await APIClient.shared.listEntries()
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    func addEntry(_ entry: Entry) {
        entries.removeAll { $0.id == entry.id }
        entries.insert(entry, at: 0)
        entries.sort { $0.createdAt > $1.createdAt }
    }

    func replace(_ entry: Entry) {
        guard let index = entries.firstIndex(where: { $0.id == entry.id }) else { return }
        entries[index] = entry
    }

    func remove(id: String) {
        entries.removeAll { $0.id == id }
    }

    var todaysEntries: [Entry] {
        let calendar = Calendar.current
        return entries.filter { calendar.isDateInToday($0.createdDate) }
    }

    /// Consecutive days with at least one entry, counting back from today
    /// (or from yesterday, if nothing has been written yet today).
    var currentStreak: Int {
        let calendar = Calendar.current
        let days = Set(entries.map { calendar.startOfDay(for: $0.createdDate) })
        guard !days.isEmpty else { return 0 }

        var day = calendar.startOfDay(for: Date())
        if !days.contains(day) {
            guard let yesterday = calendar.date(byAdding: .day, value: -1, to: day) else { return 0 }
            day = yesterday
        }

        var streak = 0
        while days.contains(day) {
            streak += 1
            guard let previous = calendar.date(byAdding: .day, value: -1, to: day) else { break }
            day = previous
        }
        return streak
    }
}
