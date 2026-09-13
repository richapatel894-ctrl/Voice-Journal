import SwiftUI

struct EntryCardView: View {
    let entry: Entry
    var onEdit: () -> Void = {}
    var onDelete: () -> Void = {}
    /// Insights shows entries read-only, mirroring the web app's distinction
    /// between an actionable card (Entries/Home) and a read-only one (Insights).
    var showActions: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        if let emoji = EmotionCatalog.emoji(for: entry.displayEmotion) {
                            Text(emoji)
                        }
                        if let theme = entry.theme, theme != "Uncategorized" {
                            Label(theme, systemImage: ThemeCatalog.icon(for: theme))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Text(entry.createdDate, style: .time)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                if showActions {
                    Menu {
                        Button("Edit", systemImage: "pencil", action: onEdit)
                        Button("Delete", systemImage: "trash", role: .destructive, action: onDelete)
                    } label: {
                        Image(systemName: "ellipsis")
                            .foregroundStyle(.secondary)
                            .padding(.leading, 4)
                    }
                }
            }

            Text(entry.text.isEmpty ? "(no text)" : entry.text)
                .font(.body)
                .foregroundStyle(entry.text.isEmpty ? .secondary : .primary)
                .lineLimit(4)

            if !entry.media.isEmpty {
                mediaRow
            }
        }
        .padding(14)
        .background(.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 16))
    }

    private var mediaRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(entry.media, id: \.self) { raw in
                    switch MediaItem.classify(raw) {
                    case .image(let filename):
                        RemoteImageView(filename: filename)
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    case .file(let filename):
                        VStack(spacing: 2) {
                            Image(systemName: "doc.fill")
                            Text(filename).font(.caption2).lineLimit(1)
                        }
                        .frame(width: 56, height: 56)
                        .background(.gray.opacity(0.15), in: RoundedRectangle(cornerRadius: 10))
                    case .link(let url):
                        Link(destination: URL(string: url) ?? URL(string: "about:blank")!) {
                            VStack(spacing: 2) {
                                Image(systemName: "link")
                                Text(url).font(.caption2).lineLimit(1)
                            }
                            .frame(width: 72, height: 56)
                            .background(.blue.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            }
        }
    }
}
