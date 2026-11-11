// Reads the iOS caret's Core Animation state every frame while it blinks,
// moves, types and selects, and prints one JSON line per event.
//
//   packages/react/research/caret/ios/run.sh
import SwiftUI
import UIKit

let log: FileHandle = {
  let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    .appendingPathComponent("probe.jsonl")
  FileManager.default.createFile(atPath: url.path, contents: nil)
  return try! FileHandle(forWritingTo: url)
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
    if type.contains("CGPoint") { let p = v.cgPointValue; return [p.x, p.y] }
    if type.contains("CGRect") { let r = v.cgRectValue; return [r.origin.x, r.origin.y, r.width, r.height] }
    if type.contains("CGSize") { let s = v.cgSizeValue; return [s.width, s.height] }
    if type.contains("CATransform3D") { let t = v.caTransform3DValue; return [t.m11, t.m22, t.m41, t.m42] }
    return "\(v)"
  case let a as [Any]: return a.map { describe($0) }
  case let c as UIColor: return "\(c)"
  default:
    if let value, CFGetTypeID(value as CFTypeRef) == CGColor.typeID {
      return UIColor(cgColor: value as! CGColor).description
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
    "speed": animation.speed,
    "timeOffset": animation.timeOffset,
  ]
  if let t = points(animation.timingFunction) { out["timing"] = t }
  if let p = animation as? CAPropertyAnimation {
    out["keyPath"] = p.keyPath ?? NSNull()
    out["additive"] = p.isAdditive
  }
  if let b = animation as? CABasicAnimation {
    out["from"] = describe(b.fromValue)
    out["to"] = describe(b.toValue)
    out["by"] = describe(b.byValue)
  }
  if let s = animation as? CASpringAnimation {
    out["mass"] = s.mass
    out["stiffness"] = s.stiffness
    out["damping"] = s.damping
    out["initialVelocity"] = s.initialVelocity
    out["settlingDuration"] = s.settlingDuration
    out["perceptualDuration"] = s.perceptualDuration
    out["bounce"] = s.bounce
  }
  if let k = animation as? CAKeyframeAnimation {
    out["values"] = describe(k.values)
    out["keyTimes"] = describe(k.keyTimes)
    out["timings"] = k.timingFunctions?.compactMap { points($0) } ?? NSNull()
    out["calculationMode"] = k.calculationMode.rawValue
  }
  if let g = animation as? CAAnimationGroup {
    out["animations"] = g.animations?.map { describe(animation: $0) } ?? []
  }
  return out
}

/// Every animation on a layer and its sublayers, keyed by path.
func animations(on layer: CALayer, path: String = "cursor") -> [String: Any] {
  var out: [String: Any] = [:]
  for key in layer.animationKeys() ?? [] {
    if let a = layer.animation(forKey: key) { out["\(path).\(key)"] = describe(animation: a) }
  }
  for (i, sub) in (layer.sublayers ?? []).enumerated() {
    out.merge(animations(on: sub, path: "\(path).\(i)"), uniquingKeysWith: { a, _ in a })
  }
  return out
}

func tree(_ layer: CALayer, depth: Int = 0) -> [String: Any] {
  let p = layer.presentation() ?? layer
  return [
    "class": String(describing: type(of: layer)),
    "delegate": layer.delegate.map { String(describing: type(of: $0)) } ?? NSNull(),
    "frame": [p.frame.origin.x, p.frame.origin.y, p.frame.width, p.frame.height],
    "opacity": p.opacity,
    "cornerRadius": p.cornerRadius,
    "background": describe(p.backgroundColor),
    "filters": describe(p.filters),
    "compositingFilter": describe(p.compositingFilter),
    "sublayers": (layer.sublayers ?? []).map { tree($0, depth: depth + 1) },
  ]
}


/// Logs every in-process spring UIKit starts, with its parameters, then runs it.
enum Hooks {
  typealias Block = @convention(block) () -> Void
  typealias Done = @convention(block) (Bool) -> Void

  static func swap<F>(_ name: String, _ make: (F) -> Any) {
    let sel = NSSelectorFromString(name)
    guard let meta = object_getClass(UIView.self), let method = class_getClassMethod(UIView.self, sel) else {
      emit(["kind": "hook-missing", "selector": name])
      return
    }
    let original = unsafeBitCast(method_getImplementation(method), to: F.self)
    method_setImplementation(method, imp_implementationWithBlock(make(original)))
    _ = meta
  }

  static func trace(_ selector: String, _ args: [String: Any]) {
    emit(["kind": "spring", "selector": selector, "args": args, "t": CACurrentMediaTime(),
          "stack": Thread.callStackSymbols.prefix(8).map { String($0.split(separator: " ", omittingEmptySubsequences: true).dropFirst(3).joined(separator: " ")) }])
  }

  static func swapInstance<F>(_ cls: AnyClass, _ name: String, _ make: (F) -> Any) {
    let sel = NSSelectorFromString(name)
    guard let method = class_getInstanceMethod(cls, sel) else {
      emit(["kind": "hook-missing", "selector": name])
      return
    }
    let original = unsafeBitCast(method_getImplementation(method), to: F.self)
    method_setImplementation(method, imp_implementationWithBlock(make(original)))
  }

  static func installTiming() {
    let spring: AnyClass = UISpringTimingParameters.self
    typealias T1 = @convention(c) (AnyObject, Selector, Double, CGVector) -> AnyObject
    let t1 = "initWithDampingRatio:initialVelocity:"
    swapInstance(spring, t1) { (o: T1) in
      { (me: AnyObject, d: Double, v: CGVector) -> AnyObject in
        trace(t1, ["dampingRatio": d, "velocity": [v.dx, v.dy]])
        return o(me, NSSelectorFromString(t1), d, v)
      } as @convention(block) (AnyObject, Double, CGVector) -> AnyObject
    }
    typealias T2 = @convention(c) (AnyObject, Selector, Double, Double, Double, CGVector) -> AnyObject
    let t2 = "initWithMass:stiffness:damping:initialVelocity:"
    swapInstance(spring, t2) { (o: T2) in
      { (me: AnyObject, m: Double, k: Double, d: Double, v: CGVector) -> AnyObject in
        trace(t2, ["mass": m, "stiffness": k, "damping": d, "velocity": [v.dx, v.dy]])
        return o(me, NSSelectorFromString(t2), m, k, d, v)
      } as @convention(block) (AnyObject, Double, Double, Double, CGVector) -> AnyObject
    }
    typealias T3 = @convention(c) (AnyObject, Selector, Double, Double, CGVector) -> AnyObject
    let t3 = "initWithDuration:bounce:initialVelocity:"
    swapInstance(spring, t3) { (o: T3) in
      { (me: AnyObject, du: Double, b: Double, v: CGVector) -> AnyObject in
        trace(t3, ["duration": du, "bounce": b, "velocity": [v.dx, v.dy]])
        return o(me, NSSelectorFromString(t3), du, b, v)
      } as @convention(block) (AnyObject, Double, Double, CGVector) -> AnyObject
    }
    typealias T4 = @convention(c) (AnyObject, Selector, Double, Double) -> AnyObject
    let t4 = "_initWithDampingRatio:response:"
    swapInstance(spring, t4) { (o: T4) in
      { (me: AnyObject, d: Double, r: Double) -> AnyObject in
        trace(t4, ["dampingRatio": d, "response": r])
        return o(me, NSSelectorFromString(t4), d, r)
      } as @convention(block) (AnyObject, Double, Double) -> AnyObject
    }
    typealias T5 = @convention(c) (AnyObject, Selector, Double, AnyObject?) -> AnyObject
    let t5 = "initWithDuration:timingParameters:"
    swapInstance(UIViewPropertyAnimator.self, t5) { (o: T5) in
      { (me: AnyObject, du: Double, p: AnyObject?) -> AnyObject in
        trace(t5, ["duration": du, "parameters": p.map { "\($0)" } ?? "nil"])
        return o(me, NSSelectorFromString(t5), du, p)
      } as @convention(block) (AnyObject, Double, AnyObject?) -> AnyObject
    }
  }

  static func installSwift() {
    typealias S1 = @convention(c) (AnyClass, Selector, Double, Double, Bool, AnyObject?, AnyObject?, Double, Double, Double, Double, Double, Block?, Done?) -> Void
    let s1 = "__swift_animateUsingSpringWithDampingRatio:response:interactive:initialDampingRatio:initialResponse:dampingRatioSmoothing:responseSmoothing:targetSmoothing:projectionDeceleration:retargetImpulse:animations:completion:"
    swap(s1) { (o: S1) in
      { (c: AnyClass, d: Double, r: Double, i: Bool, id: AnyObject?, ir: AnyObject?, ds: Double, rs: Double, ts: Double, pd: Double, ri: Double, a: Block?, k: Done?) in
        trace(s1, ["dampingRatio": d, "response": r, "interactive": i, "initialDampingRatio": id.map { "\($0)" } ?? "nil", "initialResponse": ir.map { "\($0)" } ?? "nil", "dampingRatioSmoothing": ds, "responseSmoothing": rs, "targetSmoothing": ts, "projectionDeceleration": pd, "retargetImpulse": ri])
        o(c, NSSelectorFromString(s1), d, r, i, id, ir, ds, rs, ts, pd, ri, a, k)
      } as @convention(block) (AnyClass, Double, Double, Bool, AnyObject?, AnyObject?, Double, Double, Double, Double, Double, Block?, Done?) -> Void
    }
    typealias S2 = @convention(c) (AnyClass, Selector, AnyObject?, Bool, Block?, Done?) -> Void
    let s2 = "__swift_animateUsingSpringBehavior:tracking:animations:completion:"
    swap(s2) { (o: S2) in
      { (c: AnyClass, b: AnyObject?, tr: Bool, a: Block?, k: Done?) in
        var args: [String: Any] = ["behavior": b.map { "\($0)" } ?? "nil", "tracking": tr]
        if let b {
          for key in ["dampingRatio", "response", "trackingDampingRatio", "trackingResponse"] where b.responds(to: NSSelectorFromString(key)) {
            if let v = b.value(forKey: key) { args[key] = v }
          }
        }
        trace(s2, args)
        o(c, NSSelectorFromString(s2), b, tr, a, k)
      } as @convention(block) (AnyClass, AnyObject?, Bool, Block?, Done?) -> Void
    }
    typealias S3 = @convention(c) (AnyClass, Selector, Double, Double, Bool, Block?, Done?) -> Void
    for name in ["__swift_animateUsingSpringWithTension:friction:interactive:animations:completion:", "_animateUsingSpringWithTension:friction:interactive:animations:completion:"] {
      swap(name) { (o: S3) in
        { (c: AnyClass, t: Double, f: Double, i: Bool, a: Block?, k: Done?) in
          trace(name, ["tension": t, "friction": f, "interactive": i])
          o(c, NSSelectorFromString(name), t, f, i, a, k)
        } as @convention(block) (AnyClass, Double, Double, Bool, Block?, Done?) -> Void
      }
    }
    typealias S4 = @convention(c) (AnyClass, Selector, Block?, Done?) -> Void
    for name in ["__swift_animateWithFrictionBounceAnimations:completion:", "_animateWithFrictionBounceAnimations:completion:", "__swift_animateByRetargetingAnimations:completion:", "_animateByRetargetingAnimations:completion:"] {
      swap(name) { (o: S4) in
        { (c: AnyClass, a: Block?, k: Done?) in
          trace(name, [:])
          o(c, NSSelectorFromString(name), a, k)
        } as @convention(block) (AnyClass, Block?, Done?) -> Void
      }
    }
    typealias S5 = @convention(c) (AnyClass, Selector, Bool, Block?, Done?) -> Void
    for name in ["__swift_animateUsingSpringInteractive:animations:completion:", "_animateUsingSpringInteractive:animations:completion:"] {
      swap(name) { (o: S5) in
        { (c: AnyClass, i: Bool, a: Block?, k: Done?) in
          trace(name, ["interactive": i])
          o(c, NSSelectorFromString(name), i, a, k)
        } as @convention(block) (AnyClass, Bool, Block?, Done?) -> Void
      }
    }
  }

  static func install() {
    installTiming()
    installSwift()
    typealias F1 = @convention(c) (AnyClass, Selector, Double, Double, Bool, Double, Double, Double, Double, Block?, Done?) -> Void
    let s1 = "_animateUsingSpringWithDampingRatio:response:tracking:dampingRatioSmoothing:responseSmoothing:targetSmoothing:projectionDeceleration:animations:completion:"
    swap(s1) { (o: F1) in
      { (c: AnyClass, d: Double, r: Double, tr: Bool, ds: Double, rs: Double, ts: Double, pd: Double, a: Block?, k: Done?) in
        trace(s1, ["dampingRatio": d, "response": r, "tracking": tr, "dampingRatioSmoothing": ds, "responseSmoothing": rs, "targetSmoothing": ts, "projectionDeceleration": pd])
        o(c, NSSelectorFromString(s1), d, r, tr, ds, rs, ts, pd, a, k)
      } as @convention(block) (AnyClass, Double, Double, Bool, Double, Double, Double, Double, Block?, Done?) -> Void
    }
    typealias F2 = @convention(c) (AnyClass, Selector, Double, Double, Bool, Double, Double, Double, Double, Double, Block?, Done?) -> Void
    let s2 = "_animateUsingSpringWithDampingRatio:response:tracking:dampingRatioSmoothing:responseSmoothing:targetSmoothing:projectionDeceleration:retargetImpulse:animations:completion:"
    swap(s2) { (o: F2) in
      { (c: AnyClass, d: Double, r: Double, tr: Bool, ds: Double, rs: Double, ts: Double, pd: Double, ri: Double, a: Block?, k: Done?) in
        trace(s2, ["dampingRatio": d, "response": r, "tracking": tr, "dampingRatioSmoothing": ds, "responseSmoothing": rs, "targetSmoothing": ts, "projectionDeceleration": pd, "retargetImpulse": ri])
        o(c, NSSelectorFromString(s2), d, r, tr, ds, rs, ts, pd, ri, a, k)
      } as @convention(block) (AnyClass, Double, Double, Bool, Double, Double, Double, Double, Double, Block?, Done?) -> Void
    }
    typealias F3 = @convention(c) (AnyClass, Selector, Double, Double, Bool, Double, Double, Double, Double, Double, Double, Block?, Done?) -> Void
    let s3 = "_animateUsingSpringWithDampingRatio:response:tracking:initialDampingRatio:initialResponse:dampingRatioSmoothing:responseSmoothing:targetSmoothing:projectionDeceleration:animations:completion:"
    swap(s3) { (o: F3) in
      { (c: AnyClass, d: Double, r: Double, tr: Bool, id: Double, ir: Double, ds: Double, rs: Double, ts: Double, pd: Double, a: Block?, k: Done?) in
        trace(s3, ["dampingRatio": d, "response": r, "tracking": tr, "initialDampingRatio": id, "initialResponse": ir, "dampingRatioSmoothing": ds, "responseSmoothing": rs, "targetSmoothing": ts, "projectionDeceleration": pd])
        o(c, NSSelectorFromString(s3), d, r, tr, id, ir, ds, rs, ts, pd, a, k)
      } as @convention(block) (AnyClass, Double, Double, Bool, Double, Double, Double, Double, Double, Double, Block?, Done?) -> Void
    }
    typealias F4 = @convention(c) (AnyClass, Selector, Double, Double, Double, Bool, Block?, Done?) -> Void
    let s4 = "_animateWithSwiftUISpringWithDuration:bounce:blendDuration:interactive:animations:completion:"
    swap(s4) { (o: F4) in
      { (c: AnyClass, du: Double, b: Double, bl: Double, i: Bool, a: Block?, k: Done?) in
        trace(s4, ["duration": du, "bounce": b, "blendDuration": bl, "interactive": i])
        o(c, NSSelectorFromString(s4), du, b, bl, i, a, k)
      } as @convention(block) (AnyClass, Double, Double, Double, Bool, Block?, Done?) -> Void
    }
    typealias F5 = @convention(c) (AnyClass, Selector, AnyObject?, Bool, Block?, Done?) -> Void
    let s5 = "_animateUsingSpringBehavior:tracking:animations:completion:"
    swap(s5) { (o: F5) in
      { (c: AnyClass, b: AnyObject?, tr: Bool, a: Block?, k: Done?) in
        var args: [String: Any] = ["behavior": b.map { "\($0)" } ?? "nil", "tracking": tr]
        if let b {
          for key in ["dampingRatio", "response", "trackingDampingRatio", "trackingResponse"] {
            if b.responds(to: NSSelectorFromString(key)), let v = b.value(forKey: key) { args[key] = v }
          }
        }
        trace(s5, args)
        o(c, NSSelectorFromString(s5), b, tr, a, k)
      } as @convention(block) (AnyClass, AnyObject?, Bool, Block?, Done?) -> Void
    }
    typealias F6 = @convention(c) (AnyClass, Selector, Double, Double, Double, Double, UInt, Block?, Done?) -> Void
    let s6 = "animateWithSpringDuration:bounce:initialSpringVelocity:delay:options:animations:completion:"
    swap(s6) { (o: F6) in
      { (c: AnyClass, du: Double, b: Double, v: Double, de: Double, op: UInt, a: Block?, k: Done?) in
        trace(s6, ["duration": du, "bounce": b, "velocity": v, "delay": de, "options": op])
        o(c, NSSelectorFromString(s6), du, b, v, de, op, a, k)
      } as @convention(block) (AnyClass, Double, Double, Double, Double, UInt, Block?, Done?) -> Void
    }
    typealias F7 = @convention(c) (AnyClass, Selector, Double, Double, Double, Double, UInt, Block?, Done?) -> Void
    let s7 = "animateWithDuration:delay:usingSpringWithDamping:initialSpringVelocity:options:animations:completion:"
    swap(s7) { (o: F7) in
      { (c: AnyClass, du: Double, de: Double, d: Double, v: Double, op: UInt, a: Block?, k: Done?) in
        trace(s7, ["duration": du, "delay": de, "damping": d, "velocity": v, "options": op])
        o(c, NSSelectorFromString(s7), du, de, d, v, op, a, k)
      } as @convention(block) (AnyClass, Double, Double, Double, Double, UInt, Block?, Done?) -> Void
    }
    typealias F8 = @convention(c) (AnyClass, Selector, Double, Double, UInt, Block?, Done?) -> Void
    let s8 = "animateWithDuration:delay:options:animations:completion:"
    swap(s8) { (o: F8) in
      { (c: AnyClass, du: Double, de: Double, op: UInt, a: Block?, k: Done?) in
        trace(s8, ["duration": du, "delay": de, "options": op])
        o(c, NSSelectorFromString(s8), du, de, op, a, k)
      } as @convention(block) (AnyClass, Double, Double, UInt, Block?, Done?) -> Void
    }
  }
}

func finite(_ n: CGFloat) -> CGFloat { n.isFinite ? n : -1 }

final class BlockTarget: NSObject {
  let block: () -> Void
  init(_ block: @escaping () -> Void) { self.block = block }
  @objc func fire() { block() }
}

final class Probe: NSObject {
  let name: String
  let field: UIView
  var link: CADisplayLink?
  var lastKeys: Set<String> = []
  var wide = false
  var start = CACurrentMediaTime()

  init(name: String, field: UIView) {
    self.name = name
    self.field = field
  }

  /// The caret view, from the public selection display interaction or by class name.
  var cursor: UIView? {
    for interaction in field.interactions {
      if let display = interaction as? UITextSelectionDisplayInteraction {
        return display.cursorView
      }
    }
    func find(_ view: UIView) -> UIView? {
      if String(describing: type(of: view)).localizedCaseInsensitiveContains("cursor") { return view }
      for sub in view.subviews { if let found = find(sub) { return found } }
      return nil
    }
    return find(field)
  }

  func begin() {
    start = CACurrentMediaTime()
    link = CADisplayLink(target: self, selector: #selector(tick))
    link?.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
    link?.add(to: .main, forMode: .common)
  }

  func stop() {
    link?.invalidate()
    link = nil
  }

  @objc func tick() {
    guard let cursor else { return }
    let layer = cursor.layer
    let p = layer.presentation() ?? layer
    let rect = cursor.superview?.convert(p.frame, to: field) ?? p.frame
    var leaf = layer
    while let first = leaf.sublayers?.first { leaf = first }
    let lp = leaf.presentation() ?? leaf
    emit([
      "probe": name, "t": CACurrentMediaTime() - start, "kind": "frame",
      "x": rect.origin.x, "y": rect.origin.y, "w": rect.width, "h": rect.height,
      "opacity": p.opacity, "leafOpacity": lp.opacity, "hidden": cursor.isHidden || cursor.alpha == 0,
      "alpha": cursor.alpha,
    ])
    var all = animations(on: layer)
    if wide, let root = field.window?.layer {
      all.merge(animations(on: root, path: "window"), uniquingKeysWith: { a, _ in a })
      var cursors: [[String: Any]] = []
      func find(_ view: UIView, _ path: String) {
        let name = String(describing: type(of: view))
        if name.localizedCaseInsensitiveContains("cursor") || name.localizedCaseInsensitiveContains("caret") {
          let p = view.layer.presentation() ?? view.layer
          let r = view.superview?.convert(p.frame, to: field) ?? p.frame
          cursors.append(["class": name, "path": path, "x": r.origin.x, "y": r.origin.y, "w": r.width, "h": r.height,
                          "opacity": p.opacity, "hidden": view.isHidden, "alpha": view.alpha,
                          "transform": describe(NSValue(caTransform3D: p.transform))])
        }
        for (i, sub) in view.subviews.enumerated() { find(sub, "\(path)/\(i)") }
      }
      if let window = field.window { find(window, "w") }
      emit(["probe": name, "t": CACurrentMediaTime() - start, "kind": "cursors", "cursors": cursors])
    }
    let keys = Set(all.keys)
    if keys != lastKeys {
      emit(["probe": name, "t": CACurrentMediaTime() - start, "kind": "animations", "animations": all])
      lastKeys = keys
    }
  }

  func dumpTree(_ label: String) {
    guard let cursor else {
      emit(["probe": name, "kind": "missing", "label": label])
      return
    }
    emit([
      "probe": name, "kind": "tree", "label": label,
      "view": String(describing: type(of: cursor)),
      "superview": cursor.superview.map { String(describing: type(of: $0)) } ?? NSNull(),
      "tint": cursor.tintColor.description,
      "layer": tree(cursor.layer),
    ])
  }

  func mark(_ label: String) {
    emit(["probe": name, "t": CACurrentMediaTime() - start, "kind": "mark", "label": label])
  }
}

final class Controller: UIViewController, UITextViewDelegate {
  var listener: Probe?
  let textView = UITextView()
  let textField = UITextField()
  var host: UIHostingController<SwiftUIField>!

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    textField.font = .systemFont(ofSize: 17)
    textField.text = "Hello world, this is a field"
    textField.borderStyle = .roundedRect
    textView.delegate = self
    textView.font = .systemFont(ofSize: 17)
    textView.text = "Hello world, this is a text view\nA second line that wraps around to show how the caret moves between lines"
    host = UIHostingController(rootView: SwiftUIField())
    for v in [textField, textView, host.view!] {
      v.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(v)
    }
    addChild(host)
    NSLayoutConstraint.activate([
      textField.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
      textField.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      textField.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      textView.topAnchor.constraint(equalTo: textField.bottomAnchor, constant: 20),
      textView.leadingAnchor.constraint(equalTo: textField.leadingAnchor),
      textView.trailingAnchor.constraint(equalTo: textField.trailingAnchor),
      textView.heightAnchor.constraint(equalToConstant: 160),
      host.view.topAnchor.constraint(equalTo: textView.bottomAnchor, constant: 20),
      host.view.leadingAnchor.constraint(equalTo: textField.leadingAnchor),
      host.view.trailingAnchor.constraint(equalTo: textField.trailingAnchor),
      host.view.heightAnchor.constraint(equalToConstant: 60),
    ])
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    Task { @MainActor in await run() }
  }

  func wait(_ seconds: Double) async {
    try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
  }

  func textViewDidChangeSelection(_ textView: UITextView) {
    let r = textView.selectedRange
    listener?.mark("selection \(r.location) \(r.length)")
  }

  func run() async {
    emit(["kind": "device", "scale": traitCollection.displayScale, "system": UIDevice.current.systemVersion])
    if CommandLine.arguments.contains("methods") {
      textView.becomeFirstResponder()
      await wait(0.5)
      var names = ["UIStandardTextCursorView", "UITextSelectionDisplayInteraction", "_UITextCursorDragAnimator"]
      if let c = Probe(name: "m", field: textView).cursor { names.append(String(describing: type(of: c))) }
      for name in Set(names) {
        var cls: AnyClass? = NSClassFromString(name)
        while let c = cls, c != NSObject.self, c != UIView.self, c != UIResponder.self {
          var count: UInt32 = 0
          var methods: [String] = []
          if let list = class_copyMethodList(c, &count) {
            for i in 0..<Int(count) { methods.append(NSStringFromSelector(method_getName(list[i]))) }
            free(list)
          }
          var props: [String] = []
          if let list = class_copyPropertyList(c, &count) {
            for i in 0..<Int(count) { props.append(String(cString: property_getName(list[i]))) }
            free(list)
          }
          var ivars: [String] = []
          if let list = class_copyIvarList(c, &count) {
            for i in 0..<Int(count) { if let n = ivar_getName(list[i]) { ivars.append(String(cString: n)) } }
            free(list)
          }
          emit(["kind": "class", "name": NSStringFromClass(c), "methods": methods.sorted(), "properties": props.sorted(), "ivars": ivars])
          cls = class_getSuperclass(c)
        }
      }
      for name in ["UIView", "UIViewPropertyAnimator", "UISpringTimingParameters"] {
        var count: UInt32 = 0
        var methods: [String] = []
        if let meta = object_getClass(NSClassFromString(name)), let list = class_copyMethodList(meta, &count) {
          for i in 0..<Int(count) {
            let sel = NSStringFromSelector(method_getName(list[i]))
            if sel.range(of: "nimat|pring|nteractive|ension|Fluid|Animation", options: .regularExpression) != nil {
              methods.append("\(sel) \(String(cString: method_getTypeEncoding(list[i])!))")
            }
          }
          free(list)
        }
        emit(["kind": "meta", "name": name, "methods": methods.sorted()])
      }
      emit(["kind": "done"])
      exit(0)
    }
    if CommandLine.arguments.contains("effects") {
      await probeEffects()
      emit(["kind": "done"])
      exit(0)
    }
    if CommandLine.arguments.contains("shot") {
      textView.becomeFirstResponder()
      await wait(1)
      select(5, 50)
      emit(["kind": "ready"])
      await wait(20)
      emit(["kind": "done"])
      exit(0)
    }
    if CommandLine.arguments.contains("selection") {
      await probeSelection()
      emit(["kind": "done"])
      exit(0)
    }
    if CommandLine.arguments.contains("listen") {
      let probe = Probe(name: "listen", field: textView)
      listener = probe
      textView.becomeFirstResponder()
      select(5)
      await wait(0.5)
      probe.begin()
      probe.mark("listening")
      await wait(40)
      probe.stop()
      emit(["kind": "done"])
      exit(0)
    }
    await probeTextView()
    await probeFonts()
    await probeTextField()
    emit(["kind": "done"])
    exit(0)
  }

  func select(_ location: Int, _ length: Int = 0) {
    textView.selectedRange = NSRange(location: location, length: length)
  }

  func probeTextView() async {
    let probe = Probe(name: "textView", field: textView)
    textView.becomeFirstResponder()
    select(5)
    await wait(1)
    probe.dumpTree("idle")
    probe.begin()
    probe.mark("idle")
    await wait(3.2)
    probe.mark("move+1")
    select(6)
    await wait(1.2)
    probe.mark("move+10")
    select(16)
    await wait(1.2)
    probe.mark("move-line")
    select(60)
    await wait(1.2)
    probe.mark("jump-start")
    select(0)
    await wait(1.2)
    probe.mark("type")
    for ch in "typing" {
      textView.insertText(String(ch))
      await wait(0.15)
    }
    probe.mark("typed")
    await wait(2.5)
    probe.mark("select")
    select(2, 6)
    await wait(1)
    probe.dumpTree("selected")
    probe.mark("collapse")
    select(4)
    await wait(1.5)
    probe.mark("arrow")
    // The hardware keyboard path: a key command the text view handles itself.
    textView.selectedTextRange = textView.textRange(
      from: textView.position(from: textView.beginningOfDocument, offset: 5)!,
      to: textView.position(from: textView.beginningOfDocument, offset: 5)!)
    await wait(1.2)
    probe.stop()
  }

  func point(_ offset: Int) -> CGPoint {
    let position = textView.position(from: textView.beginningOfDocument, offset: offset)!
    let r = textView.caretRect(for: position)
    return CGPoint(x: r.midX, y: r.midY)
  }

  /// The highlight and handles UIKit draws for a range, every frame, while the
  /// range grows from the caret, spans lines, shrinks, moves and collapses.
  func probeSelection() async {
    Hooks.install()
    textView.becomeFirstResponder()
    select(5)
    await wait(1)
    guard let display = textView.interactions.compactMap({ $0 as? UITextSelectionDisplayInteraction }).first else {
      emit(["kind": "missing", "label": "display interaction"])
      return
    }
    let start = CACurrentMediaTime()
    var last = ""
    var lastAnimations = ""

    func flatten(_ view: UIView, _ path: String, into out: inout [[String: Any]], anims: inout [String: Any]) {
      let layer = view.layer
      let p = layer.presentation() ?? layer
      let r = view.superview?.convert(p.frame, to: textView) ?? p.frame
      out.append([
        "path": path, "class": String(describing: type(of: view)),
        "frame": [r.origin.x, r.origin.y, r.width, r.height].map { finite(($0 * 100).rounded() / 100) },
        "alpha": view.alpha, "opacity": p.opacity, "hidden": view.isHidden,
        "background": describe(p.backgroundColor), "tint": view.tintColor.description,
        "cornerRadius": p.cornerRadius, "cornerCurve": p.cornerCurve.rawValue,
        "transform": describe(NSValue(caTransform3D: p.transform)),
      ])
      func layers(_ l: CALayer, _ lp: String) {
        if let shape = l as? CAShapeLayer {
          let sp = shape.presentation() ?? shape
          let box = sp.path.map { $0.isEmpty ? .zero : $0.boundingBox } ?? .zero
          var elements: [String] = []
          sp.path?.applyWithBlock { e in
            let el = e.pointee
            let n = [1, 1, 2, 3, 0][Int(el.type.rawValue)]
            let pts = (0..<n).map { "\((el.points[$0].x * 100).rounded() / 100),\((el.points[$0].y * 100).rounded() / 100)" }
            elements.append("\(["M", "L", "Q", "C", "Z"][Int(el.type.rawValue)]) \(pts.joined(separator: " "))")
          }
          out.append(["path": lp, "class": "CAShapeLayer", "elements": elements, "pathBox": [box.origin.x, box.origin.y, box.width, box.height].map(finite),
                      "fill": describe(sp.fillColor), "stroke": describe(sp.strokeColor), "lineWidth": sp.lineWidth, "opacity": sp.opacity])
        }
        for (i, sub) in (l.sublayers ?? []).enumerated() where sub.delegate == nil { layers(sub, "\(lp).\(i)") }
      }
      layers(layer, path + "#")
      if path.hasPrefix("handle") { out.append(["path": path + "@", "tree": tree(layer)]) }
      anims.merge(animations(on: layer, path: path), uniquingKeysWith: { a, _ in a })
      for (i, sub) in view.subviews.enumerated() { flatten(sub, "\(path)/\(i)", into: &out, anims: &anims) }
    }

    func tick() {
      var views: [[String: Any]] = []
      var anims: [String: Any] = [:]
      let highlight = display.highlightView
      flatten(highlight, "highlight", into: &views, anims: &anims)
      for (i, handle) in display.handleViews.enumerated() { flatten(handle, "handle\(i)", into: &views, anims: &anims) }
      let rects = highlight.selectionRects.map { r -> [String: Any] in
        let f = highlight.convert(r.rect, to: textView)
        return ["rect": [f.origin.x, f.origin.y, f.width, f.height].map(finite), "start": r.containsStart, "end": r.containsEnd]
      }
      let t = CACurrentMediaTime() - start
      let state: [String: Any] = ["views": views, "rects": rects]
      let key = String(data: try! JSONSerialization.data(withJSONObject: state, options: [.sortedKeys]), encoding: .utf8)!
      if key != last { emit(["kind": "selection", "t": t, "state": state]); last = key }
      let akey = String(data: try! JSONSerialization.data(withJSONObject: anims, options: [.sortedKeys]), encoding: .utf8)!
      if akey != lastAnimations { emit(["kind": "animations", "t": t, "animations": anims]); lastAnimations = akey }
    }

    let link = CADisplayLink(target: BlockTarget(tick), selector: #selector(BlockTarget.fire))
    link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
    link.add(to: .main, forMode: .common)
    let mark = { (label: String) in emit(["kind": "mark", "label": label, "t": CACurrentMediaTime() - start]) }

    for (label, location, length) in [
      ("grow 4", 5, 4), ("grow 10", 5, 10), ("lines", 5, 50), ("shrink", 5, 10),
      ("move", 20, 5), ("collapse", 12, 0), ("again", 12, 8), ("all", 0, textView.text.count), ("collapse end", 30, 0),
    ] {
      mark(label)
      select(location, length)
      await wait(1.2)
    }
    link.invalidate()
  }

  func probeEffects() async {
    Hooks.install()
    emit(["kind": "clock", "t": CACurrentMediaTime()])
    let probe = Probe(name: "effects", field: textView)
    probe.wide = true
    textView.becomeFirstResponder()
    select(5)
    await wait(1)
    probe.begin()

    // The space bar trackpad: what the keyboard calls while the space bar is held.
    probe.mark("float-begin")
    let from = point(5)
    textView.beginFloatingCursor(at: from)
    await wait(0.6)
    let to = point(70)
    for i in 1...60 {
      let k = CGFloat(i) / 60
      probe.mark("float-update \(i)")
      textView.updateFloatingCursor(at: CGPoint(x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k))
      await wait(1.0 / 60)
    }
    await wait(0.4)
    probe.mark("float-end")
    textView.endFloatingCursor()
    await wait(1.5)

    // Drag and drop: the public animator that moves the caret to a drop position.
    if let cursor = probe.cursor as? (UIView & UITextCursorView) {
      let animator = UITextCursorDropPositionAnimator(textCursorView: cursor, textInput: textView)!
      if let ivar = class_getInstanceVariable(type(of: animator), "_impl"), let impl = object_getIvar(animator, ivar) as AnyObject? {
        var cls: AnyClass? = type(of: impl)
        while let c = cls, c != NSObject.self {
          var n: UInt32 = 0
          var methods: [String] = []
          if let list = class_copyMethodList(c, &n) {
            for i in 0..<Int(n) { methods.append(NSStringFromSelector(method_getName(list[i]))) }
            free(list)
          }
          var ivars: [String] = []
          if let list = class_copyIvarList(c, &n) {
            for i in 0..<Int(n) { ivars.append(String(cString: ivar_getName(list[i])!) + " " + (ivar_getTypeEncoding(list[i]).map { String(cString: $0) } ?? "?")) }
            free(list)
          }
          emit(["kind": "impl", "name": NSStringFromClass(c), "methods": methods, "ivars": ivars])
          cls = class_getSuperclass(c)
        }
      }
      if let list = Optional(class_copyMethodList(object_getClass(UIView.self), nil)) {
        var n: UInt32 = 0
        let all = class_copyMethodList(object_getClass(UIView.self), &n)!
        for i in 0..<Int(n) where NSStringFromSelector(method_getName(all[i])).hasPrefix("__swift_animate") {
          emit(["kind": "encoding", "selector": NSStringFromSelector(method_getName(all[i])), "types": String(cString: method_getTypeEncoding(all[i])!)])
        }
        free(all)
        _ = list
      }
      probe.mark("drop-visible")
      animator.setCursorVisible(true, animated: true)
      await wait(0.8)
      for offset in [12, 30, 70, 2] {
        probe.mark("drop-move \(offset)")
        let position = textView.position(from: textView.beginningOfDocument, offset: offset)!
        animator.placeCursor(at: position, animated: true)
        await wait(1.0)
      }
      probe.mark("drop-hidden")
      animator.setCursorVisible(false, animated: true)
      await wait(1.0)
    }

    // The bulge the caret gives in place.
    select(5)
    await wait(1)
    for interaction in textView.interactions {
      if let display = interaction as? UITextSelectionDisplayInteraction {
        probe.mark("bulge")
        display.perform(NSSelectorFromString("_performCursorBulgeAnimation"))
      }
    }
    await wait(1.5)
    probe.stop()
  }

  func probeFonts() async {
    let probe = Probe(name: "fonts", field: textView)
    for size in [11.0, 13.0, 15.0, 17.0, 20.0, 28.0, 34.0, 48.0] {
      textView.font = .systemFont(ofSize: size)
      select(3)
      await wait(0.4)
      if let c = probe.cursor {
        emit(["probe": "fonts", "kind": "size", "font": size, "w": c.bounds.width, "h": c.bounds.height,
              "ascender": textView.font!.ascender, "descender": textView.font!.descender,
              "lineHeight": textView.font!.lineHeight, "capHeight": textView.font!.capHeight])
      }
    }
    textView.font = .systemFont(ofSize: 17)
  }

  func probeTextField() async {
    let probe = Probe(name: "textField", field: textField)
    textField.becomeFirstResponder()
    await wait(1)
    probe.dumpTree("idle")
    probe.begin()
    probe.mark("move")
    let start = textField.beginningOfDocument
    textField.selectedTextRange = textField.textRange(
      from: textField.position(from: start, offset: 3)!, to: textField.position(from: start, offset: 3)!)
    await wait(1.2)
    probe.mark("jump")
    textField.selectedTextRange = textField.textRange(
      from: textField.position(from: start, offset: 20)!, to: textField.position(from: start, offset: 20)!)
    await wait(1.2)
    probe.stop()
  }
}

struct SwiftUIField: View {
  @State var text = "SwiftUI field"
  var body: some View { TextField("Name", text: $text).textFieldStyle(.roundedBorder) }
}

struct ControllerView: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> Controller { Controller() }
  func updateUIViewController(_ controller: Controller, context: Context) {}
}

@main
struct CaretProbe: App {
  var body: some Scene {
    WindowGroup { ControllerView().ignoresSafeArea(.keyboard) }
  }
}
