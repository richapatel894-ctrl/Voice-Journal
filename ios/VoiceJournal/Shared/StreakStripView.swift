import SwiftUI

/// Duolingo/gratitude-app style consistency strip, per the requirements doc.
struct StreakStripView: View {
    let streak: Int

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "flame.fill")
                .foregroundStyle(streak > 0 ? .orange : .gray)
            Text(streak > 0 ? "\(streak)-day streak" : "Start your streak today")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.white.opacity(0.6), in: Capsule())
    }
}
