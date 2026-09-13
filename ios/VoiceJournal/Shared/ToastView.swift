import SwiftUI

/// Lightweight save confirmation — a toast, not a heavy modal, per the
/// requirements doc's Home section.
struct ToastView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.subheadline.weight(.semibold))
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.thinMaterial, in: Capsule())
            .shadow(radius: 4, y: 2)
    }
}
