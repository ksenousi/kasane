import SwiftUI
import WidgetKit

@main
struct KasaneApp: App {
    var body: some Scene {
        WindowGroup { ContentView() }
    }
}

/// The app only exists to carry the widget: it shows this hour's word and how to add it.
struct ContentView: View {
    var body: some View {
        TimelineView(.periodic(from: Words.hourStart(.now), by: 3600)) { context in
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("This hour").font(.subheadline).foregroundStyle(.secondary)
                    WordLines(word: Words.word(at: context.date), wordSize: 56, readingSize: 20, meaningSize: 24)
                }
                VStack(alignment: .leading, spacing: 8) {
                    Text("Add the widget").font(.headline)
                    Text("Touch and hold the lock screen, tap Customize, pick the lock screen, then tap the box under the clock and choose Kasane.")
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
