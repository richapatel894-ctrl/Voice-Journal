import SwiftUI

enum InsightsPeriod: String, CaseIterable, Identifiable {
    case threeMonths = "3M"
    case sixMonths = "6M"
    case twelveMonths = "12M"
    case thisYear = "Year"
    case allTime = "All"
    var id: String { rawValue }

    /// Mirrors frontend/app.js's rangeCutoff().
    var cutoff: Date? {
        let calendar = Calendar.current
        let now = Date()
        switch self {
        case .threeMonths: return calendar.date(byAdding: .month, value: -3, to: now)
        case .sixMonths: return calendar.date(byAdding: .month, value: -6, to: now)
        case .twelveMonths: return calendar.date(byAdding: .month, value: -12, to: now)
        case .thisYear: return calendar.date(from: calendar.dateComponents([.year], from: now))
        case .allTime: return nil
        }
    }
}

/// Emotion map with an adjustable period, a written snapshot, an actionable
/// what/why/how layer, and a journaling-frequency heatmap — the full
/// Insights feature set from the requirements doc.
struct InsightsView: View {
    @ObservedObject private var store = EntriesStore.shared
    @State private var period: InsightsPeriod = .threeMonths
    @State private var selectedEmotion: String?

    private var entriesInRange: [Entry] {
        guard let cutoff = period.cutoff else { return store.entries }
        return store.entries.filter { $0.createdDate >= cutoff }
    }

    private var bubbles: [EmotionBubble] {
        var counts: [String: Int] = [:]
        for entry in entriesInRange {
            guard let emotion = entry.displayEmotion else { continue }
            counts[emotion, default: 0] += 1
        }
        return counts.compactMap { emotion, count in
            guard let coords = EmotionCatalog.coords[emotion] else { return nil }
            return EmotionBubble(emotion: emotion, count: count, valence: coords.valence, arousal: coords.arousal)
        }
    }

    private var selectedEntries: [Entry] {
        guard let selectedEmotion else { return [] }
        return entriesInRange
            .filter { $0.displayEmotion == selectedEmotion }
            .sorted { $0.createdAt > $1.createdAt }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    periodPicker
                    emotionMapSection
                    summarySection
                    if let selectedEmotion {
                        selectedEmotionSection(selectedEmotion)
                    }
                    frequencySection
                }
                .padding()
            }
            .background(Color.journalPink.opacity(0.08))
            .navigationTitle("Insights")
            .task { if store.entries.isEmpty { await store.refresh() } }
            .refreshable { await store.refresh() }
        }
    }

    private var periodPicker: some View {
        Picker("Period", selection: $period) {
            ForEach(InsightsPeriod.allCases) { Text($0.rawValue).tag($0) }
        }
        .pickerStyle(.segmented)
        .onChange(of: period) { _, _ in selectedEmotion = nil }
    }

    private var emotionMapSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Emotional map").font(.headline)
            if bubbles.isEmpty {
                Text("No emotions in this range yet.").foregroundStyle(.secondary).font(.callout)
            } else {
                EmotionMapView(bubbles: bubbles) { emotion in
                    selectedEmotion = (selectedEmotion == emotion) ? nil : emotion
                }
            }
        }
    }

    private var summarySection: some View {
        let topTheme = topCount { $0.theme }
        let topEmotion = topCount { $0.displayEmotion }

        return VStack(alignment: .leading, spacing: 8) {
            Text("Your snapshot").font(.headline)
            if entriesInRange.isEmpty {
                Text("No entries in this range.").foregroundStyle(.secondary).font(.callout)
            } else {
                Text("\(entriesInRange.count) entries in this window.").font(.callout)
                if let topTheme {
                    Text("Most-written theme: **\(topTheme.value)** (\(topTheme.count)).").font(.callout)
                }
                if let topEmotion {
                    Text("Most-felt emotion: **\(topEmotion.value)** (\(topEmotion.count)).").font(.callout)
                    if let guidance = EmotionGuidanceCatalog.guidance[topEmotion.value] {
                        actionableCard(emotion: topEmotion.value, guidance: guidance)
                    }
                }
            }
        }
    }

    private func actionableCard(emotion: String, guidance: EmotionGuidance) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("\(emotion) — what, why, how", systemImage: "lightbulb.fill")
                .font(.subheadline.weight(.semibold))
            Text("What: \(guidance.what)").font(.footnote)
            Text("Why: \(guidance.why)").font(.footnote)
            Text("How: \(guidance.how)").font(.footnote)
        }
        .padding(12)
        .background(Color.journalPink.opacity(0.18), in: RoundedRectangle(cornerRadius: 12))
    }

    private func selectedEmotionSection(_ emotion: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("\(EmotionCatalog.emoji(for: emotion) ?? "") \(emotion) — \(selectedEntries.count) entries")
                .font(.headline)
            ForEach(selectedEntries) { entry in
                EntryCardView(entry: entry, showActions: false)
            }
        }
    }

    private var frequencySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Journaling frequency").font(.headline)
            HeatmapView(entries: store.entries)
        }
    }

    private func topCount(_ key: (Entry) -> String?) -> (value: String, count: Int)? {
        var counts: [String: Int] = [:]
        for entry in entriesInRange {
            guard let value = key(entry), !value.isEmpty, value != "Uncategorized" else { continue }
            counts[value, default: 0] += 1
        }
        return counts.max { $0.value < $1.value }.map { (value: $0.key, count: $0.value) }
    }
}
