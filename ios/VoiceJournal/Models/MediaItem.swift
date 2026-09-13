import Foundation

/// An entry's `media` array mixes three kinds of string: server filenames
/// (uploaded files/photos) and full URLs (attached links, filenames never
/// contain "://" — see backend/server.js).
enum MediaItem {
    case image(filename: String)
    case file(filename: String)
    case link(url: String)

    private static let imageExtensions: Set<String> = ["jpg", "jpeg", "png", "gif", "heic", "webp"]

    static func classify(_ raw: String) -> MediaItem {
        if raw.contains("://") { return .link(url: raw) }
        let ext = (raw as NSString).pathExtension.lowercased()
        return imageExtensions.contains(ext) ? .image(filename: raw) : .file(filename: raw)
    }

    var displayName: String {
        switch self {
        case .image(let filename), .file(let filename): return filename
        case .link(let url): return url
        }
    }
}
