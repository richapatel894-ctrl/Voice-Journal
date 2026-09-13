import SwiftUI

/// AsyncImage can't attach the X-API-Key header the backend requires, so
/// media thumbnails are fetched through APIClient instead.
struct RemoteImageView: View {
    let filename: String
    var contentMode: ContentMode = .fill

    @State private var uiImage: UIImage?
    @State private var failed = false

    var body: some View {
        Group {
            if let uiImage {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
            } else if failed {
                Image(systemName: "photo")
                    .foregroundStyle(.secondary)
            } else {
                ProgressView()
            }
        }
        .task(id: filename) {
            guard uiImage == nil else { return }
            do {
                let data = try await APIClient.shared.fetchMediaData(filename: filename)
                uiImage = UIImage(data: data)
                if uiImage == nil { failed = true }
            } catch {
                failed = true
            }
        }
    }
}
