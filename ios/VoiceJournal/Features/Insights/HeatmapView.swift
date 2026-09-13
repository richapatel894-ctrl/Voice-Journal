import SwiftUI

/// GitHub-contributions-style calendar heatmap of journaling frequency,
/// per the requirements doc's Insights section.
struct HeatmapView: View {
    let entries: [Entry]
    var weeks: Int = 16

    private var dayCounts: [Date: Int] {
        let calendar = Calendar.current
        var counts: [Date: Int] = [:]
        for entry in entries {
            let day = calendar.startOfDay(for: entry.createdDate)
            counts[day, default: 0] += 1
        }
        return counts
    }

    /// Columns run oldest → newest, each a Sunday...Saturday week ending on
    /// the most recent Saturday on/after today.
    private var columns: [[Date]] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let weekday = calendar.component(.weekday, from: today) // 1 = Sunday
        guard let weekEnd = calendar.date(byAdding: .day, value: 7 - weekday, to: today) else { return [] }

        var result: [[Date]] = []
        for w in stride(from: weeks - 1, through: 0, by: -1) {
            var column: [Date] = []
            for dayOffset in 0..<7 {
                let offset = -(w * 7) - (6 - dayOffset)
                if let day = calendar.date(byAdding: .day, value: offset, to: weekEnd) {
                    column.append(calendar.startOfDay(for: day))
                }
            }
            result.append(column)
        }
        return result
    }

    var body: some View {
        let counts = dayCounts
        let maxCount = max(counts.values.max() ?? 1, 1)
        let today = Calendar.current.startOfDay(for: Date())

        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 3) {
                ForEach(Array(columns.enumerated()), id: \.offset) { _, column in
                    VStack(spacing: 3) {
                        ForEach(column, id: \.self) { day in
                            RoundedRectangle(cornerRadius: 3)
                                .fill(cellColor(count: counts[day] ?? 0, max: maxCount, isFuture: day > today))
                                .frame(width: 12, height: 12)
                        }
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    private func cellColor(count: Int, max: Int, isFuture: Bool) -> Color {
        if isFuture { return .clear }
        if count == 0 { return Color.gray.opacity(0.15) }
        let intensity = min(1.0, Double(count) / Double(max))
        return Color.journalPinkDark.opacity(0.3 + intensity * 0.6)
    }
}
