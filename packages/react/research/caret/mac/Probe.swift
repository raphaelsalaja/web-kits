// Reads the macOS caret (NSTextInsertionIndicator) every frame while it blinks,
// moves, types and selects, and prints one JSON line per event.
//
//   packages/react/research/caret/mac/run.sh
import AppKit
import QuartzCore

let out = CommandLine.arguments.dropFirst().first(where: { $0.hasSuffix(".jsonl") }) ?? "/tmp/caret-probe/mac.jsonl"
let log: FileHandle = {
  FileManager.default.createFile(atPath: out, contents: nil)
  return try! FileHandle(forWritingTo: URL(fileURLWithPath: out))
}()

func emit(_ object: [String: Any]) {
  guard let data = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
  else { return }
  log.write(data)
  log.write(Data([0x0A]))
}

func points(_ fn: CAMediaTimingFunction?) -> [Float]? {
  guard let fn else { return nil }
  var out: [Float] = []
  for i in 0..<4 {
    var p: [Float] = [0, 0]
    fn.getControlPoint(at: i, values: &p)
    out += p
  }
  return out
}

func describe(_ value: Any?) -> Any {
  switch value {
  case nil: return NSNull()
  case let n as NSNumber: return n
  case let v as NSValue:
    let type = String(cString: v.objCType)
    if type.contains("CGPoint") { let p = v.pointValue; return [p.x, p.y] }
    if type.contains("CGRect") { let r = v.rectValue; return [r.origin.x, r.origin.y, r.width, r.height] }
    if type.contains("CGSize") { let s = v.sizeValue; return [s.width, s.height] }
    if type.contains("CATransform3D") { let t = v.caTransform3DValue; return [t.m11, t.m22, t.m41, t.m42] }
    return "\(v)"
  case let a as [Any]: return a.map { describe($0) }
  default:
    if let value, CFGetTypeID(value as CFTypeRef) == CGColor.typeID {
      return NSColor(cgColor: value as! CGColor)?.description ?? "cgcolor"
    }
    return "\(value!)"
  }
}

func describe(animation: CAAnimation) -> [String: Any] {
  var out: [String: Any] = [
    "class": String(describing: type(of: animation)),
    "duration": animation.duration,
    "beginTime": animation.beginTime,
    "repeatCount": animation.repeatCount,
    "autoreverses": animation.autoreverses,
    "fillMode": animation.fillMode.rawValue,
    "removedOnCompletion": animation.isRemovedOnCompletion,
  ]
  if let t = points(animation.timingFunction) { out["timing"] = t }
  if let p = animation as? CAPropertyAnimation {
    out["keyPath"] = p.keyPath ?? NSNull()
    out["additive"] = p.isAdditive
  }
  if let b = animation as? CABasicAnimation {
    out["from"] = describe(b.fromValue)
    out["to"] = describe(b.toValue)
  }
  if let s = animation as? CASpringAnimation {
    out["mass"] = s.mass
    out["stiffness"] = s.stiffness
    out["damping"] = s.damping
    out["initialVelocity"] = s.initialVelocity
    out["settlingDuration"] = s.settlingDuration
  }
  if let k = animation as? CAKeyframeAnimation {
    out["values"] = describe(k.values)
    out["keyTimes"] = describe(k.keyTimes)
    out["calculationMode"] = k.calculationMode.rawValue
    out["timings"] = k.timingFunctions?.compactMap { points($0) } ?? NSNull()
  }
  if let g = animation as? CAAnimationGroup {
    out["animations"] = g.animations?.map { describe(animation: $0) } ?? []
  }
  return out
}

func animations(on layer: CALayer, path: String = "") -> [String: [String: Any]] {
  var found: [String: [String: Any]] = [:]
  let here = path.isEmpty ? String(describing: type(of: layer)) : path
  for key in layer.animationKeys() ?? [] {
    if let a = layer.animation(forKey: key) { found["\(here)#\(key)"] = describe(animation: a) }
  }
  for (i, sub) in (layer.sublayers ?? []).enumerated() {
    found.merge(animations(on: sub, path: "\(here)/\(i):\(type(of: sub))")) { a, _ in a }
  }
  return found
}

func dump(_ name: String) {
  guard let cls = NSClassFromString(name) else { return emit(["kind": "missing", "name": name]) }
  var n: UInt32 = 0
  var methods: [String] = []
  if let list = class_copyMethodList(cls, &n) {
    for i in 0..<Int(n) { methods.append(NSStringFromSelector(method_getName(list[i]))) }
    free(list)
  }
  var ivars: [String] = []
  if let list = class_copyIvarList(cls, &n) {
    for i in 0..<Int(n) { ivars.append(String(cString: ivar_getName(list[i])!)) }
    free(list)
  }
  emit(["kind": "class", "name": name, "super": NSStringFromClass(class_getSuperclass(cls)!), "methods": methods.sorted(), "ivars": ivars])
}

final class KeyWindow: NSWindow {
  override var canBecomeKey: Bool { true }
  override var isKeyWindow: Bool { true }
}

final class Probe: NSObject {
  let field: NSTextView
  let start = CACurrentMediaTime()
  var timer: Timer?
  var last = ""
  var lastAnimations: [String: [String: Any]] = [:]

  init(field: NSTextView) {
    self.field = field
  }

  var now: Double { CACurrentMediaTime() - start }

  func indicators(in view: NSView) -> [NSView] {
    var found: [NSView] = []
    for sub in view.subviews {
      if NSStringFromClass(type(of: sub)).contains("Insertion") { found.append(sub) }
      found += indicators(in: sub)
    }
    return found
  }

  func begin() {
    timer = Timer(timeInterval: 1.0 / 240, repeats: true) { [weak self] _ in self?.tick() }
    RunLoop.main.add(timer!, forMode: .common)
  }

  func stop() { timer?.invalidate() }

  func mark(_ label: String) { emit(["kind": "mark", "label": label, "t": now]) }

  func tick() {
    var state: [[String: Any]] = []
    var anims: [String: [String: Any]] = [:]
    for (i, view) in indicators(in: field).enumerated() {
      let layer = view.layer
      let presentation = layer?.presentation()
      var leaves: [Double] = []
      func walk(_ l: CALayer) {
        leaves.append(Double((l.presentation() ?? l).opacity))
        l.sublayers?.forEach(walk)
      }
      if let layer { walk(layer) }
      let frame = presentation?.frame ?? view.frame
      state.append([
        "class": NSStringFromClass(type(of: view)),
        "x": (frame.origin.x * 100).rounded() / 100,
        "y": (frame.origin.y * 100).rounded() / 100,
        "w": (frame.width * 100).rounded() / 100,
        "h": (frame.height * 100).rounded() / 100,
        "alpha": view.alphaValue,
        "hidden": view.isHidden,
        "opacity": leaves.map { ($0 * 1000).rounded() / 1000 },
        "mode": (view as? NSTextInsertionIndicator)?.displayMode.rawValue ?? -1,
      ])
      if let layer {
        anims.merge(animations(on: layer, path: "\(i)")) { a, _ in a }
      }
    }
    let key = "\(state)"
    if key != last {
      emit(["kind": "frame", "t": now, "views": state])
      last = key
    }
    let added = anims.filter { lastAnimations[$0.key] == nil }
    let removed = lastAnimations.keys.filter { anims[$0] == nil }
    if !added.isEmpty || !removed.isEmpty {
      emit(["kind": "animations", "t": now, "added": added, "removed": removed])
    }
    lastAnimations = anims
  }
}

@MainActor
final class Runner {
  let window = KeyWindow(contentRect: NSRect(x: 80, y: 80, width: 480, height: 240), styleMask: [.titled], backing: .buffered, defer: false)
  let scroll = NSTextView.scrollableTextView()
  var field: NSTextView { scroll.documentView as! NSTextView }

  func wait(_ s: Double) async { try? await Task.sleep(nanoseconds: UInt64(s * 1_000_000_000)) }

  func run() async {
    for name in ["NSTextInsertionIndicator", "_NSTextInsertionIndicatorEffectView", "NSTextInsertionIndicatorEffectView"] { dump(name) }
    emit(["kind": "defaults",
          "NSTextInsertionPointBlinkPeriodOn": UserDefaults.standard.object(forKey: "NSTextInsertionPointBlinkPeriodOn") ?? NSNull(),
          "NSTextInsertionPointBlinkPeriodOff": UserDefaults.standard.object(forKey: "NSTextInsertionPointBlinkPeriodOff") ?? NSNull(),
          "NSTextInsertionPointBlinkPeriod": UserDefaults.standard.object(forKey: "NSTextInsertionPointBlinkPeriod") ?? NSNull()])

    scroll.frame = window.contentView!.bounds
    scroll.autoresizingMask = [.width, .height]
    window.contentView!.addSubview(scroll)
    field.font = .systemFont(ofSize: 13)
    field.string = "The quick brown fox jumps over the lazy dog.\nSecond line of text here."
    window.orderFront(nil)
    window.makeFirstResponder(field)
    field.setSelectedRange(NSRange(location: 0, length: 0))
    await wait(0.5)

    let probe = Probe(field: field)
    for view in probe.indicators(in: field) {
      func tree(_ l: CALayer) -> [String: Any] {
        [
          "class": String(describing: type(of: l)), "name": l.name ?? NSNull(),
          "frame": [l.frame.origin.x, l.frame.origin.y, l.frame.width, l.frame.height],
          "cornerRadius": l.cornerRadius, "cornerCurve": l.cornerCurve.rawValue,
          "background": describe(l.backgroundColor), "opacity": l.opacity,
          "compositingFilter": describe(l.compositingFilter), "filters": describe(l.filters),
          "contentsScale": l.contentsScale, "hasContents": l.contents != nil,
          "sublayers": (l.sublayers ?? []).map(tree),
        ]
      }
      emit(["kind": "tree", "frame": [view.frame.origin.x, view.frame.origin.y, view.frame.width, view.frame.height],
            "color": String(describing: (view as? NSTextInsertionIndicator)?.color.usingColorSpace(.sRGB)),
            "layer": view.layer.map(tree) ?? NSNull()])
    }
    probe.begin()
    emit(["kind": "color", "insertionPointColor": String(describing: field.insertionPointColor)])

    probe.mark("idle")
    await wait(3.2)

    for location in [10, 30, 46, 4] {
      probe.mark("select \(location)")
      field.setSelectedRange(NSRange(location: location, length: 0))
      await wait(1.2)
    }

    probe.mark("moveRight")
    for _ in 0..<5 {
      field.doCommand(by: #selector(NSResponder.moveRight(_:)))
      await wait(0.12)
    }
    await wait(1.2)
    probe.mark("moveDown")
    field.doCommand(by: #selector(NSResponder.moveDown(_:)))
    await wait(1.2)
    probe.mark("moveToEndOfLine")
    field.doCommand(by: #selector(NSResponder.moveToEndOfLine(_:)))
    await wait(1.2)

    probe.mark("type")
    for ch in "hello" {
      field.insertText(String(ch), replacementRange: field.selectedRange())
      await wait(0.15)
    }
    await wait(1.6)

    probe.mark("range")
    field.setSelectedRange(NSRange(location: 4, length: 5))
    await wait(1)
    probe.mark("collapse")
    field.setSelectedRange(NSRange(location: 9, length: 0))
    await wait(1.5)

    probe.mark("font 28")
    field.font = .systemFont(ofSize: 28)
    await wait(1)

    probe.mark("unfocus")
    window.makeFirstResponder(nil)
    await wait(1)
    probe.mark("focus")
    window.makeFirstResponder(field)
    await wait(1.5)

    probe.stop()
    emit(["kind": "done"])
    exit(0)
  }
}

MainActor.assumeIsolated {
  let app = NSApplication.shared
  app.setActivationPolicy(.accessory)
  let runner = Runner()
  Task { @MainActor in await runner.run() }
  app.run()
}
