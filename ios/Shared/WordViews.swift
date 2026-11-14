import SwiftUI
import WidgetKit

/// Three lines: the word, its hiragana, its English meaning. Kana-only words skip the
/// hiragana line since it would repeat the word.
struct WordLines: View {
    let word: Word
    var wordSize: CGFloat = 26
    var readingSize: CGFloat = 12
    var meaningSize: CGFloat = 14
    var showExample = true

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(word.word)
                .font(.system(size: wordSize, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            if !word.isKanaOnly {
                Text(word.reading)
                    .font(.system(size: readingSize, weight: .medium))
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
            Text(word.meaning)
                .font(.system(size: meaningSize, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if showExample && !word.example.isEmpty {
                ExampleLine(text: word.example, size: meaningSize * 0.7)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Lock screen box under the clock.
struct RectangularView: View {
    let word: Word
    var body: some View {
        WordLines(word: word).widgetAccentable()
    }
}

/// Single line above the clock.
struct InlineView: View {
    let word: Word
    var body: some View {
        Text(word.isKanaOnly ? "\(word.word) \(word.meaning)" : "\(word.word) \(word.reading) \(word.meaning)")
    }
}

/// Home screen small square.
struct SmallView: View {
    let word: Word
    var body: some View {
        WordLines(word: word, wordSize: 40, readingSize: 15, meaningSize: 17)
            .frame(maxHeight: .infinity, alignment: .center)
    }
}

/// One line of example sentence, shrinking a little before it truncates.
struct ExampleLine: View {
    let text: String
    var size: CGFloat = 10
    var body: some View {
        Text(text)
            .font(.system(size: size, weight: .medium))
            .lineLimit(1)
            .minimumScaleFactor(0.75)
            .opacity(0.75)
    }
}
