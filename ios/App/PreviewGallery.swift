#if DEBUG
import SwiftUI

/// Debug only: hardest words at real widget sizes, for screenshots. Launch with -preview lock|small.
struct PreviewGallery: View {
    let page: String

    static func pick(_ ids: [String]) -> [Word] { ids.compactMap { id in Words.all.first { $0.id == id } } }
    var hard: [Word] {
        let all = Words.all
        let byMeaning = all.sorted { $0.meaning.count > $1.meaning.count }
        let byExample = all.sorted { $0.example.count > $1.example.count }
        let byWord = all.sorted { $0.word.count > $1.word.count }
        let kana = all.filter(\.isKanaOnly).sorted { $0.word.count > $1.word.count }
        return [all.first { $0.word == "騒ぎ" }!, byMeaning[0], byMeaning[1], byExample[0], byWord[0], kana[0], all.first { $0.word == "碁" }!, byMeaning[5]]
    }

    var body: some View {
        ScrollView {
            if page == "lock" { lock } else { small }
        }
        .background(Color.black)
        .preferredColorScheme(.dark)
    }

    var lock: some View {
        VStack(alignment: .leading, spacing: 10) {
            ZStack(alignment: .top) {
                LinearGradient(colors: [Color(red: 0.32, green: 0.4, blue: 0.5), Color(red: 0.75, green: 0.55, blue: 0.4), Color(red: 0.1, green: 0.1, blue: 0.12)], startPoint: .top, endPoint: .bottom)
                VStack(spacing: 0) {
                    Text("Sat 14 Nov").font(.system(size: 19, weight: .semibold))
                    Text("9:41").font(.system(size: 96, weight: .semibold))
                    RectangularView(word: hard[0]).frame(width: 148, height: 58)
                }
                .foregroundStyle(.white.opacity(0.9))
                .padding(.top, 20)
            }
            .frame(height: 250).clipShape(RoundedRectangle(cornerRadius: 20))
            Text("Hard cases · left 148×58 (iPhone 18 Pro, iOS 27) · right 172×76 (largest)").font(.caption).foregroundStyle(.secondary)
            ForEach(hard.dropFirst(), id: \.self) { w in
                HStack(spacing: 12) {
                    box(w, 148, 58)
                    box(w, 172, 76)
                }
            }
        }
        .padding(16)
    }

    func box(_ w: Word, _ width: CGFloat, _ height: CGFloat) -> some View {
        RectangularView(word: w).foregroundStyle(.white)
            .frame(width: width, height: height)
            .background(Color.white.opacity(0.06))
            .overlay(Rectangle().stroke(.white.opacity(0.25), lineWidth: 0.5))
    }

    var small: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Small / StandBy · left 155 pt (iPhone SE) · right 170 pt").font(.caption).foregroundStyle(.secondary)
            ForEach(Array(hard.prefix(6)), id: \.self) { w in
                HStack(spacing: 12) {
                    tile(w, 155)
                    tile(w, 170)
                }
            }
        }
        .padding(16)
    }

    func tile(_ w: Word, _ side: CGFloat) -> some View {
        SmallView(word: w).foregroundStyle(.white)
            .padding(16)
            .frame(width: side, height: side)
            .background(Color(white: 0.11), in: RoundedRectangle(cornerRadius: 22))
            .overlay(RoundedRectangle(cornerRadius: 22).inset(by: 16).stroke(.white.opacity(0.12), lineWidth: 0.5))
    }
}
#endif
#if DEBUG
/// Debug only: how often each lock screen plan is chosen across every word at a box size.
enum PlanAudit {
    static func run() {
        for (w, h) in [(148.0, 58.0), (160.0, 72.0), (172.0, 76.0)] {
            var counts: [String: Int] = [:]
            for word in Words.all {
                let p = RectangularView.plan(word, width: w, height: h)
                counts["word \(Int(p.word)) meaning \(Int(p.meaning)) example \(p.example.map { "\(Int($0))" } ?? "none")", default: 0] += 1
            }
            print("== \(Int(w))x\(Int(h))")
            for (k, v) in counts.sorted(by: { $0.value > $1.value }) { print("  \(v)\t\(k)") }
        }
    }
}
#endif
