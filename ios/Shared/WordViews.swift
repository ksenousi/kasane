import SwiftUI
import WidgetKit

// Every layout here offers SwiftUI a list of options via ViewThatFits, biggest first, and
// the widget takes the first whose lines all fit at full size. Text is never shrunk to fit
// unless every option fails: the example sentence is dropped first, then a long meaning wraps.

/// A single line of text at a fixed size that never shrinks or wraps, so ViewThatFits can
/// tell when it doesn't fit.
private struct Line: View {
    let text: String
    let size: CGFloat
    var weight: Font.Weight = .semibold
    var opacity: Double = 1

    init(_ text: String, _ size: CGFloat, _ weight: Font.Weight = .semibold, opacity: Double = 1) {
        self.text = text; self.size = size; self.weight = weight; self.opacity = opacity
    }

    var body: some View {
        Text(text)
            .font(.system(size: size, weight: weight))
            .lineLimit(1)
            .fixedSize()
            .opacity(opacity)
    }
}

// MARK: - Lock screen

/// Lock screen box under the clock (about 160–172 × 72–76 pt): word, hiragana, meaning,
/// example. Sizes keep all four lines inside 72 pt so nothing clips on smaller iPhones.
struct RectangularView: View {
    let word: Word

    var body: some View {
        ViewThatFits {
            lines(example: true)
            lines(example: false)
            // Long meanings (about 1 in 70) wrap onto a second line instead of shrinking.
            VStack(alignment: .leading, spacing: 0) {
                Line(word.word, 22)
                if !word.isKanaOnly { Line(word.reading, 12, .medium) }
                Text(word.meaning)
                    .font(.system(size: 13, weight: .semibold))
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .widgetAccentable()
    }

    private func lines(example: Bool) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Line(word.word, 22)
            if !word.isKanaOnly { Line(word.reading, 12, .medium) }
            Line(word.meaning, 14)
            if example && !word.example.isEmpty { Line(word.example, 11, .medium, opacity: 0.8) }
        }
    }
}

/// Single line above the clock. iOS truncates it itself when it runs long.
struct InlineView: View {
    let word: Word
    var body: some View {
        Text(word.isKanaOnly ? "\(word.word) \(word.meaning)" : "\(word.word) \(word.reading) \(word.meaning)")
    }
}

// MARK: - Home screen and StandBy

/// Home screen small square, which is also what StandBy shows (scaled up, often in pairs).
/// Centered and large so it reads from across a room.
struct SmallView: View {
    let word: Word

    var body: some View {
        GeometryReader { geo in
            let example = Self.fitsTwoLines(word.example, width: geo.size.width)
            ViewThatFits(in: .vertical) {
                content(wordSize: 42, example: example)
                content(wordSize: 34, example: example)
                content(wordSize: 42, example: false)
                content(wordSize: 34, example: false)
                content(wordSize: 28, example: false)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .widgetAccentable()
    }

    static let exampleSize: CGFloat = 12

    /// Japanese glyphs are all one em wide, so the character count says how many lines the
    /// sentence takes. Three lines leaves a stray word or two on the last, so stop at two.
    static func fitsTwoLines(_ text: String, width: CGFloat) -> Bool {
        !text.isEmpty && CGFloat(text.count) * exampleSize <= 2 * width
    }

    private func content(wordSize: CGFloat, example: Bool) -> some View {
        VStack(spacing: 3) {
            FittedWord(text: word.word, maxSize: wordSize)
            if !word.isKanaOnly { Line(word.reading, 14, .medium, opacity: 0.8) }
            Text(word.meaning)
                .font(.system(size: 16, weight: .semibold))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            if example {
                Text(word.example)
                    .font(.system(size: Self.exampleSize, weight: .medium))
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .opacity(0.7)
                    .padding(.top, 3)
            }
        }
    }
}

/// The headword at the largest of a few sizes that fits the width on one line.
private struct FittedWord: View {
    let text: String
    let maxSize: CGFloat

    var body: some View {
        ViewThatFits(in: .horizontal) {
            Line(text, maxSize)
            Line(text, (maxSize * 0.85).rounded())
            Line(text, (maxSize * 0.72).rounded())
            Text(text).font(.system(size: (maxSize * 0.6).rounded(), weight: .semibold))
                .lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

// MARK: - App

/// Larger version for the app screen.
struct WordHero: View {
    let word: Word
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(word.word).font(.system(size: 56, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.5)
            if !word.isKanaOnly { Text(word.reading).font(.system(size: 20, weight: .medium)) }
            Text(word.meaning).font(.system(size: 24, weight: .semibold))
            if !word.example.isEmpty {
                Text(word.example).font(.system(size: 17)).foregroundStyle(.secondary).padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
