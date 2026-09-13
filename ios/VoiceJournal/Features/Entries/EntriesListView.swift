import SwiftUI

enum EntrySort: String, CaseIterable, Identifiable {
    case newest = "Newest"
    case oldest = "Oldest"
    case theme = "Theme"
    case emotion = "Emotion"
    var id: String { rawValue }
}

/// Searchable, sortable, filterable — default chronological, with an optional
/// grouped-by-theme view, per the requirements doc's Entries & Collections section.
struct EntriesListView: View {
    @ObservedObject private var store = EntriesStore.shared

    @State private var searchText = ""
    @State private var filterTheme: String?
    @State private var filterEmotion: String?
    @State private var sort: EntrySort = .newest
    @State private var groupByTheme = false
    @State private var editingEntry: Entry?

    var body: some View {
        NavigationStack {
            List {
                controls
                if groupByTheme {
                    ForEach(groupedByTheme, id: \.theme) { group in
                        Section(group.theme) {
                            ForEach(group.entries) { entry in row(entry) }
                        }
                    }
                } else {
                    ForEach(filteredSorted) { entry in row(entry) }
                }

                if filteredSorted.isEmpty {
                    Text("No entries yet. Go record one!")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .listRowSeparator(.hidden)
                }
            }
            .listStyle(.plain)
            .searchable(text: $searchText, prompt: "Search entries")
            .navigationTitle("Entries")
            .task { if store.entries.isEmpty { await store.refresh() } }
            .refreshable { await store.refresh() }
            .sheet(item: $editingEntry) { entry in
                ComposerView(existing: entry) { updated in store.replace(updated) }
            }
        }
    }

    private func row(_ entry: Entry) -> some View {
        EntryCardView(
            entry: entry,
            onEdit: { editingEntry = entry },
            onDelete: { Task { try? await APIClient.shared.deleteEntry(id: entry.id); store.remove(id: entry.id) } }
        )
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 4, leading: 12, bottom: 4, trailing: 12))
    }

    private var controls: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Menu {
                    Button("All themes") { filterTheme = nil }
                    ForEach(ThemeCatalog.all, id: \.self) { theme in
                        Button(theme) { filterTheme = theme }
                    }
                } label: {
                    Label(filterTheme ?? "All themes", systemImage: "line.3.horizontal.decrease.circle")
                }
                Menu {
                    Button("All emotions") { filterEmotion = nil }
                    ForEach(EmotionCatalog.all, id: \.self) { emotion in
                        Button("\(EmotionCatalog.emoji[emotion] ?? "") \(emotion)") { filterEmotion = emotion }
                    }
                } label: {
                    Label(filterEmotion ?? "All emotions", systemImage: "face.smiling")
                }
                Spacer()
                Menu {
                    ForEach(EntrySort.allCases) { option in
                        Button(option.rawValue) { sort = option }
                    }
                } label: {
                    Label(sort.rawValue, systemImage: "arrow.up.arrow.down")
                }
            }
            .font(.caption)

            Toggle("Group by theme", isOn: $groupByTheme)
                .font(.caption)
        }
        .listRowSeparator(.hidden)
    }

    private var filtered: [Entry] {
        store.entries.filter { entry in
            (filterTheme == nil || entry.theme == filterTheme)
                && (filterEmotion == nil || entry.displayEmotion == filterEmotion)
                && (searchText.isEmpty || entry.text.localizedCaseInsensitiveContains(searchText))
        }
    }

    private var filteredSorted: [Entry] {
        switch sort {
        case .newest: return filtered.sorted { $0.createdAt > $1.createdAt }
        case .oldest: return filtered.sorted { $0.createdAt < $1.createdAt }
        case .theme: return filtered.sorted { ($0.theme ?? "") < ($1.theme ?? "") }
        case .emotion: return filtered.sorted { ($0.displayEmotion ?? "") < ($1.displayEmotion ?? "") }
        }
    }

    private var groupedByTheme: [(theme: String, entries: [Entry])] {
        let groups = Dictionary(grouping: filteredSorted) { $0.theme ?? "Uncategorized" }
        return groups.keys.sorted().map { ($0, groups[$0] ?? []) }
    }
}
