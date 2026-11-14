import SwiftUI
import WidgetKit

@main
struct KasaneApp: App {
    @Environment(\.scenePhase) private var phase

    init() {
        #if DEBUG
        if CommandLine.arguments.contains("-plan-audit") { PlanAudit.run() }
        #endif
    }

    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if let i = CommandLine.arguments.firstIndex(of: "-preview"), i + 1 < CommandLine.arguments.count {
                PreviewGallery(page: CommandLine.arguments[i + 1])
            } else { ContentView() }
            #else
            ContentView()
            #endif
        }
        // A new build or word list should show on the widget right away, not at its next
        // scheduled refresh (up to a day later).
        .onChange(of: phase) { _, now in
            if now == .active { WidgetCenter.shared.reloadAllTimelines() }
        }
    }
}

/// The app only exists to carry the widget: it shows this hour's word and how to add it.
struct ContentView: View {
    var body: some View {
        TimelineView(.periodic(from: Words.hourStart(.now), by: 3600)) { context in
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("This hour").font(.subheadline).foregroundStyle(.secondary)
                    WordHero(word: Words.word(at: context.date))
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Add the widget").font(.headline)
                    Text("Touch and hold the lock screen, tap Customize, pick the lock screen, then tap the box under the clock and choose Kasane.\n\nFor StandBy, add the small Kasane widget to the home screen, then charge the phone on its side while locked.")
                        .foregroundStyle(.secondary)
                    Text("\(Words.all.count) words, a new one every hour.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
            }
            .padding(24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .preferredColorScheme(.dark)
    }
}

