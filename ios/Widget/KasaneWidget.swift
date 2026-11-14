import SwiftUI
import WidgetKit

struct WordEntry: TimelineEntry {
    let date: Date
    let word: Word
}

struct HourlyProvider: TimelineProvider {
    func placeholder(in context: Context) -> WordEntry {
        WordEntry(date: .now, word: Words.word(at: .now))
    }

    func getSnapshot(in context: Context, completion: @escaping (WordEntry) -> Void) {
        completion(WordEntry(date: .now, word: Words.word(at: .now)))
    }

    /// One entry per hour for the next day; iOS asks for a new timeline when it runs out.
    func getTimeline(in context: Context, completion: @escaping (Timeline<WordEntry>) -> Void) {
        let start = Words.hourStart(.now)
        let entries = (0..<24).map { h in
            let date = start.addingTimeInterval(Double(h) * 3600)
            return WordEntry(date: date, word: Words.word(at: date))
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

struct KasaneWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WordEntry

    var body: some View {
        switch family {
        case .accessoryRectangular: RectangularView(word: entry.word)
        case .accessoryInline: InlineView(word: entry.word)
        default: SmallView(word: entry.word)
        }
    }
}

struct KasaneWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "KasaneWord", provider: HourlyProvider()) { entry in
            KasaneWidgetView(entry: entry)
                .containerBackground(for: .widget) { Color(red: 0.086, green: 0.086, blue: 0.094) }
        }
        .configurationDisplayName("Word of the hour")
        .description("A new Kasane word every hour.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline, .systemSmall])
    }
}

@main
struct KasaneWidgetBundle: WidgetBundle {
    var body: some Widget { KasaneWidget() }
}

#Preview(as: .accessoryRectangular) {
    KasaneWidget()
} timeline: {
    WordEntry(date: .now, word: Word(id: "a", word: "山", reading: "やま", meaning: "mountain", example: "山に登った。"))
    WordEntry(date: .now, word: Word(id: "b", word: "奨学金", reading: "しょうがくきん", meaning: "scholarship", example: "奨学金をもらった。"))
}
