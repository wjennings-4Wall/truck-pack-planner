function TPViewer(el, opts) {
  const THREE = window.THREE; opts = opts || {};
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(opts.bg != null ? opts.bg : 0x0d0f12);
  renderer.domElement.style.display = 'block'; renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f47, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(0.6, 1, 0.8); scene.add(sun);
  const persp = new THREE.PerspectiveCamera(38, 1, 1, 40000), ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -40000, 40000);
  let markStep = null, cam = persp, view = 'iso', controls = null, plan = null, step = 0, root = null, metas = [], cursor = null, filterType = null;
  const texCache = [];
  function lum(hex) { const c = parseInt(hex.slice(1), 16), r = (c >> 16) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255; return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function shade(hex, f) { const c = parseInt(hex.slice(1), 16); const ch = s => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * f))); return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')'; }
  function fitText(ctx, t, maxW, size, weight) { let s = size; do { ctx.font = weight + ' ' + s + 'px Roboto, Arial, sans-serif'; if (ctx.measureText(t).width <= maxW) break; s -= 1; } while (s > 7); return s; }
  function labelTex(color, name, sub, num, wIn, hIn) {
    const cw = 256, ch = Math.max(48, Math.min(512, Math.round(256 * hIn / wIn)));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch; const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, cw, ch);
    x.strokeStyle = shade(color, 0.55); x.lineWidth = 6; x.strokeRect(3, 3, cw - 6, ch - 6);
    const ink = lum(color) > 0.55 ? '#111' : '#fff';
    const pad = 12, base = Math.min(ch * 0.34, 44);
    x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
    const s1 = fitText(x, num, cw - pad * 2, Math.round(base * 1.25), '700'); x.font = '700 ' + s1 + 'px Roboto, Arial, sans-serif';
    x.fillText(num, cw / 2, ch * 0.3);
    const s2 = fitText(x, name, cw - pad * 2, Math.round(base * 0.62), '700'); x.font = '700 ' + s2 + 'px Roboto, Arial, sans-serif';
    x.fillText(name, cw / 2, ch * 0.62);
    const s3 = fitText(x, sub, cw - pad * 2, Math.round(base * 0.5), '400'); x.font = '400 ' + s3 + 'px Roboto, Arial, sans-serif';
    x.fillText(sub, cw / 2, ch * 0.84);
    const t = new THREE.CanvasTexture(c); t.anisotropy = 4; texCache.push(t); return t;
  }
  function sprite(text, size, color, bg) {
    const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = '700 48px "Bebas Neue", Roboto, Arial, sans-serif';
    const w = Math.ceil(x.measureText(text).width) + 28; c.width = w; c.height = 64;
    x.font = '700 48px "Bebas Neue", Roboto, Arial, sans-serif'; if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, 64); }
    x.fillStyle = color; x.textBaseline = 'middle'; x.textAlign = 'center'; x.fillText(text, w / 2, 34);
    const t = new THREE.CanvasTexture(c); texCache.push(t);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(size * w / 64, size, 1); s.renderOrder = 10; return s;
  }
  function lines(pts, color, op) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: op != null, opacity: op == null ? 1 : op }));
  }
  function clear() {
    if (root) { root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); }); scene.remove(root); }
    texCache.splice(0).forEach(t => t.dispose()); metas = []; cursor = null;
  }
  function build(p) {
    clear(); plan = p; root = new THREE.Group(); scene.add(root);
    const T = p.truck, L = T.L, W = T.W, H = T.H, metric = p.units === 'metric';
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L), new THREE.MeshLambertMaterial({ color: 0x2b3038 }));
    floor.rotation.x = -Math.PI / 2; root.add(floor);
    const gp = [], stepIn = metric ? 100 / 2.54 / 2 : 12;
    for (let z = stepIn; z < L; z += stepIn) gp.push(-W / 2, 0.2, z - L / 2, W / 2, 0.2, z - L / 2);
    root.add(lines(gp, 0x48505c, 0.7));
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, L)), new THREE.LineBasicMaterial({ color: 0x7d8796 }));
    box.position.set(0, H / 2, 0); root.add(box);
    const wm = new THREE.MeshBasicMaterial({ color: 0x8fa3bf, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false });
    const nose = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wm); nose.position.set(0, H / 2, -L / 2); root.add(nose);
    const dw = new THREE.Mesh(new THREE.PlaneGeometry(L, H), wm); dw.rotation.y = Math.PI / 2; dw.position.set(-W / 2, H / 2, 0); root.add(dw);
    const cw = dw.clone(); cw.position.x = W / 2; root.add(cw);
    const dW = Math.min(T.doorW || W, W), dH = Math.min(T.doorH || H, H), zD = L / 2 + 0.5;
    root.add(lines([-dW / 2, 0, zD, -dW / 2, dH, zD, -dW / 2, dH, zD, dW / 2, dH, zD, dW / 2, dH, zD, dW / 2, 0, zD], 0x2f8cff));
    const ls = Math.max(9, L / 34);
    const sN = sprite('NOSE', ls, '#cfd6df'); sN.position.set(0, H + ls, -L / 2); root.add(sN);
    const sD = sprite('DOORS', ls, '#5aa7ff'); sD.position.set(0, H + ls, L / 2); root.add(sD);
    const sDr = sprite('DRIVER SIDE', ls * 0.8, '#9aa6b5'); sDr.position.set(-W / 2 - ls * 2.6, 2, 0); root.add(sDr);
    const sC = sprite('CURB SIDE', ls * 0.8, '#9aa6b5'); sC.position.set(W / 2 + ls * 2.4, 2, 0); root.add(sC);
    const mk = metric ? 100 / 2.54 : 48;
    for (let d = mk; d < L - mk * 0.3; d += mk) { const s = sprite(metric ? Math.round(d * 2.54 / 100) + ' m' : Math.round(d / 12) + "'", ls * 0.65, '#7d8796'); s.position.set(-W / 2 - ls * 0.9, 1, d - L / 2); root.add(s); }
    const mats = {};
    p.boxes.forEach(b => {
      const side = mats[b.color] || (mats[b.color] = new THREE.MeshLambertMaterial({ color: b.color }));
      const sub = (b.of > 1 ? b.idx + ' of ' + b.of : '') + (b.short ? (b.of > 1 ? ' · ' : '') + b.short : '');
      const top = new THREE.MeshLambertMaterial({ map: labelTex(b.color, b.name, sub, '#' + b.seq, b.W, b.L) });
      const front = new THREE.MeshLambertMaterial({ map: labelTex(b.color, b.name, sub, '#' + b.seq, b.W, b.H) });
      const big = p.boxes.length > 160;
      const lside = big ? side : new THREE.MeshLambertMaterial({ map: labelTex(b.color, b.name, sub, '#' + b.seq, b.L, b.H) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(b.W, b.H, b.L), [lside, lside, top, side, front, side]);
      m.position.set(b.y + b.W / 2 - W / 2, b.z + b.H / 2, b.x + b.L / 2 - L / 2);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x0a0a0a }));
      m.add(e); m.userData = Object.assign({}, b, { _c: [m.position.x, m.position.y, m.position.z, b.W + 1.5, b.H + 1.5, b.L + 1.5] }); root.add(m); metas.push(m);
    });
    const barMat = new THREE.MeshLambertMaterial({ color: 0xd3d8df }), padMat = new THREE.MeshLambertMaterial({ color: 0xff7a00 });
    const strapMat = new THREE.MeshLambertMaterial({ color: 0xffc400 }), ratMat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
    (p.restraints || []).forEach(r => {
      const gr = new THREE.Group(), zc = r.x + r.thick / 2 - L / 2;
      r.parts.forEach(pt => {
        if (pt.type === 'bar') {
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, W - 4, 16), barMat); bar.rotation.z = Math.PI / 2; bar.position.set(0, pt.h, zc); gr.add(bar);
          [-1, 1].forEach(sg => { const pad = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 4), padMat); pad.position.set(sg * (W / 2 - 1), pt.h, zc); gr.add(pad); });
        } else {
          const st = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 2, 0.6), strapMat); st.position.set(0, pt.h, zc); gr.add(st);
          const rat = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 2.5), ratMat); rat.position.set(W * 0.18, pt.h, zc); gr.add(rat);
        }
      });
      const top = Math.max.apply(null, r.parts.map(q => q.h)), lab = sprite(r.short, ls * 0.62, '#ffd24d', 'rgba(0,0,0,.55)');
      lab.position.set(0, top + ls * 0.9, zc); gr.add(lab);
      gr.userData = Object.assign({}, r, { _c: [0, (top + 4) / 2, zc, W + 2, top + 6, Math.max(4, r.thick + 2)] });
      root.add(gr); metas.push(gr);
    });
    metas.sort((a, b) => a.userData.step - b.userData.step);
    cursor = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffffff, depthTest: false }));
    cursor.renderOrder = 20; cursor.visible = false; root.add(cursor);
    step = metas.length; apply(); setView(view, true);
  }
  function apply() {
    let cur = null;
    const tgt = markStep != null ? markStep : step;
    metas.forEach(m => { const b = m.userData; m.visible = b.step <= step && (!filterType || filterType === b.typeId); if (b.step === tgt && (markStep != null || step < metas.length)) cur = m; });
    if (cursor) cursor.material.color.set(markStep != null ? 0x5aa7ff : 0xffffff);
    if (cursor) { cursor.visible = !!cur; if (cur) { const c = cur.userData._c; cursor.position.set(c[0], c[1], c[2]); cursor.scale.set(c[3], c[4], c[5]); } }
    render();
  }
  function size() { return [Math.max(1, el.clientWidth), Math.max(1, el.clientHeight)]; }
  function fitOrtho(w, h) {
    const [cw, ch] = size(), a = cw / ch, m = 1.12; let hw = w * m / 2, hh = h * m / 2;
    if (hw / hh > a) hh = hw / a; else hw = hh * a;
    ortho.left = -hw; ortho.right = hw; ortho.top = hh; ortho.bottom = -hh; ortho.zoom = 1; ortho.updateProjectionMatrix();
  }
  function setView(v, keep) {
    view = v || 'iso'; if (!plan) return;
    const T = plan.truck, L = T.L, W = T.W, H = T.H, D = Math.max(L, W, H) * 3;
    if (controls) controls.dispose();
    if (view === 'iso') {
      cam = persp; const [cw, ch] = size(); persp.aspect = cw / ch; persp.updateProjectionMatrix(); persp.up.set(0, 1, 0);
      const r = Math.max(L, 2.2 * W) * (cw / ch < 1 ? 1.7 : 1.05);
      persp.position.set(W * 0.9 + r * 0.42, H * 0.6 + r * 0.55, L / 2 + r * 0.55); persp.lookAt(0, H * 0.25, -L * 0.05);
    } else {
      cam = ortho;
      if (view === 'top') { ortho.up.set(1, 0, 0); ortho.position.set(0, D, 0); fitOrtho(L + 40, W + 60); }
      else if (view === 'side') { ortho.up.set(0, 1, 0); ortho.position.set(-D, H / 2, 0); fitOrtho(L + 40, H + 40); }
      else { ortho.up.set(0, 1, 0); ortho.position.set(0, H / 2, D); fitOrtho(W + 80, H + 40); }
      ortho.lookAt(0, view === 'top' ? 0 : H / 2, 0);
    }
    if (THREE.OrbitControls && opts.interactive !== false) {
      controls = new THREE.OrbitControls(cam, renderer.domElement);
      controls.target.set(0, view === 'iso' ? H * 0.25 : view === 'top' ? 0 : H / 2, view === 'iso' ? -L * 0.05 : 0);
      controls.enableRotate = view === 'iso'; controls.screenSpacePanning = true; controls.maxPolarAngle = Math.PI / 2 - 0.02;
      controls.addEventListener('change', render); controls.update();
    }
    render();
  }
  function render() { const [w, h] = size(); renderer.setSize(w, h, false); if (cam === persp) { persp.aspect = w / h; persp.updateProjectionMatrix(); } renderer.render(scene, cam); }
  const ro = new ResizeObserver(() => { if (view !== 'iso') setView(view); else render(); }); ro.observe(el);
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4 || !opts.onPick) return;
    const r = renderer.domElement.getBoundingClientRect(), v = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(v, cam);
    const hit = rc.intersectObjects(metas.filter(m => m.visible), true).find(h => h.object.type !== 'LineSegments' && h.object.type !== 'Sprite');
    let o = hit && hit.object; while (o && o.userData.step == null) o = o.parent;
    opts.onPick(o ? o.userData : null);
  });
  return {
    setPlan: build, setView, render,
    get view() { return view; }, get step() { return step; },
    setStep(n) { step = Math.max(0, Math.min(metas.length, n | 0)); apply(); },
    filter(t) { filterType = t || null; apply(); },
    mark(n) { markStep = n == null ? null : n; apply(); },
    snapshot(w, h, v, st, fmt) {
      const ov = view, os = step, of = filterType, om = markStep; markStep = null; el.style.width = w + 'px'; el.style.height = h + 'px';
      renderer.setPixelRatio(1); filterType = null; if (st != null) step = st; setView(v || ov); apply();
      const url = fmt === 'jpeg' ? renderer.domElement.toDataURL('image/jpeg', 0.88) : renderer.domElement.toDataURL('image/png');
      el.style.width = ''; el.style.height = ''; renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      step = os; filterType = of; markStep = om; setView(ov); apply(); return url;
    }
  };
}
