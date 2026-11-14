import SwiftUI
import UIKit
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

/// Lock screen box under the clock (about 160–172 × 72–76 pt). Sizes keep everything inside
/// 72 pt so nothing clips on smaller iPhones.
struct RectangularView: View {
    let word: Word
    var body: some View {
        besideWord
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetAccentable()
    }

    // Word and hiragana share the first line, then the meaning, then the example.
    private var besideWord: some View {
        GeometryReader { geo in
            let p = Self.plan(word, width: geo.size.width, height: geo.size.height)
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Line(word.word, p.word)
                    if !word.isKanaOnly {
                        Text(word.reading).font(.system(size: p.reading, weight: .medium)).lineLimit(1).minimumScaleFactor(0.8)
                    }
                }
                Text(word.meaning)
                    .font(.system(size: p.meaning, weight: .semibold))
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .fixedSize(horizontal: false, vertical: true)
                if let size = p.example {
                    Text(word.example)
                        .font(.system(size: size, weight: .medium))
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .leading)
        }
    }

    struct Plan: Equatable { var word: CGFloat; var reading: CGFloat; var meaning: CGFloat; var example: CGFloat? }

    /// Picks font sizes for the box iOS actually gives the widget (it differs by iPhone and iOS
    /// version: 148×58 on an iPhone 18 Pro with iOS 27, up to 172×76 elsewhere). Options run
    /// biggest first; the first where every line fits is used. Nothing is shrunk to fit.
    static func plan(_ word: Word, width: CGFloat, height: CGFloat) -> Plan {
        let withExample: [Plan] = [
            Plan(word: 22, reading: 13, meaning: 14, example: 13),
            Plan(word: 20, reading: 13, meaning: 14, example: 13),
            Plan(word: 20, reading: 12, meaning: 13, example: 12),
        ]
        let without: [Plan] = [
            Plan(word: 24, reading: 14, meaning: 15, example: nil),
            Plan(word: 22, reading: 13, meaning: 14, example: nil),
            Plan(word: 20, reading: 12, meaning: 13, example: nil),
            Plan(word: 18, reading: 11, meaning: 12, example: nil),
        ]
        for p in (word.example.isEmpty ? [] : withExample) + without where fits(p, word, width, height) { return p }
        return without.last!
    }

    static func fits(_ p: Plan, _ word: Word, _ width: CGFloat, _ height: CGFloat) -> Bool {
        // First line: the word and its reading side by side.
        var top = Measure.width(word.word, p.word, .semibold)
        if !word.isKanaOnly { top += 5 + Measure.width(word.reading, p.reading, .medium) }
        guard top <= width else { return false }
        let meaningLines = Measure.lines(word.meaning, p.meaning, .semibold, width: width)
        guard meaningLines <= 2 else { return false }
        var used = Measure.lineHeight(p.word, .semibold) + CGFloat(meaningLines) * Measure.lineHeight(p.meaning, .semibold)
        if let ex = p.example {
            // With an example the meaning must stay on one line, and the example too when space
            // is tight; a second example line only if it all still fits.
            guard meaningLines == 1 else { return false }
            let exLines = Measure.lines(word.example, ex, .medium, width: width)
            guard exLines <= 2 else { return false }
            used += CGFloat(exLines) * Measure.lineHeight(ex, .medium)
        }
        return used <= height
    }
}

/// Text measurement with the system font, for layout decisions SwiftUI can't make itself.
enum Measure {
    static func font(_ size: CGFloat, _ weight: Font.Weight) -> UIFont {
        let w: UIFont.Weight = weight == .semibold ? .semibold : weight == .medium ? .medium : .regular
        return UIFont.systemFont(ofSize: size, weight: w)
    }

    /// Height of one line, measured on Japanese text since its fallback font sets the height.
    static func lineHeight(_ size: CGFloat, _ weight: Font.Weight) -> CGFloat {
        ceil(("あA" as NSString).boundingRect(with: CGSize(width: 1000, height: 1000), options: [.usesLineFragmentOrigin],
                                              attributes: [.font: font(size, weight)], context: nil).height)
    }

    /// Width of the text on one line.
    static func width(_ text: String, _ size: CGFloat, _ weight: Font.Weight) -> CGFloat {
        ceil((text as NSString).size(withAttributes: [.font: font(size, weight)]).width)
    }

    /// Lines the text wraps to at this width.
    static func lines(_ text: String, _ size: CGFloat, _ weight: Font.Weight, width: CGFloat) -> Int {
        let h = (text as NSString).boundingRect(with: CGSize(width: width, height: 1000), options: [.usesLineFragmentOrigin],
                                                attributes: [.font: font(size, weight)], context: nil).height
        return max(1, Int((h / lineHeight(size, weight)).rounded()))
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
                content(wordSize: 40, example: example)
                content(wordSize: 32, example: example)
                content(wordSize: 26, example: example)
                content(wordSize: 42, example: false)
                content(wordSize: 34, example: false)
                content(wordSize: 28, example: false)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .widgetAccentable()
    }

    static let exampleSize: CGFloat = 15

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
                    .opacity(0.85)
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
