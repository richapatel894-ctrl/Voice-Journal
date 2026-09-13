import SwiftUI

/// Home / Entries / Insights / Settings — Media is folded into Settings,
/// per the requirements doc's explicit de-prioritization of a media tab.
struct RootTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }
            EntriesListView()
                .tabItem { Label("Entries", systemImage: "list.bullet") }
            InsightsView()
                .tabItem { Label("Insights", systemImage: "chart.bar.xaxis") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
        .tint(Color.journalPinkDark)
    }
}
