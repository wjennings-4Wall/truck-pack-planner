/* Truck pack engine. Units: inches, lbs. x = from nose (bulkhead) toward doors, y = from driver wall, z = up. */
function packTruck(truck, types, rules) {
  const R = Object.assign({ gap: 0, support: 0.75, heavyBottom: true, strictGroups: false, maxStack: 0 }, rules || {});
  const g = Math.max(0, +R.gap || 0), E = 0.01;
  const TL = truck.L + g, TW = truck.W + g;
  const TH = Math.min(truck.H, R.maxStack > 0 ? R.maxStack : Infinity);
  const doorW = truck.doorW || truck.W, doorH = truck.doorH || truck.H;
  const items = [], unplaced = [];
  types.forEach(t => {
    const q = Math.max(0, Math.floor(+t.qty || 0));
    const list = Array.isArray(t.units) ? t.units : Array.from({ length: q }, (_, i) => i + 1);
    for (const i of list) items.push({ type: t.id, idx: i, of: +t.of || q, l: +t.l, w: +t.w, h: +t.h, wt: t.wt === '' || t.wt == null ? null : +t.wt, rot: t.rotate !== false, stack: t.stack !== false, sitOn: t.sitOn || 'same', maxStack: Math.floor(+t.maxStack) > 0 ? Math.floor(+t.maxStack) : Infinity, grp: +t.group || 1, capped: !!t.capped });
  });
  const fits = [], pinned = [];
  const pinMap = new Map((R.pins || []).map(p => [p.type + '#' + p.idx, p]));
  items.forEach(it => {
    if (!(it.l > 0 && it.w > 0 && it.h > 0)) return unplaced.push({ item: it, reason: 'Missing dimensions' });
    if (it.h > doorH) return unplaced.push({ item: it, reason: 'Taller than the door opening' });
    if (Math.min(it.l, it.w) > doorW) return unplaced.push({ item: it, reason: 'Wider than the door opening' });
    if (it.h > TH) return unplaced.push({ item: it, reason: 'Taller than the usable height' });
    const okL = it.l <= truck.L && it.w <= truck.W, okR = it.rot && it.w <= truck.L && it.l <= truck.W;
    if (!okL && !okR) return unplaced.push({ item: it, reason: 'Larger than the truck floor' });
    const pin = pinMap.get(it.type + '#' + it.idx);
    if (pin && ((Math.abs(pin.L - it.l) < 0.01 && Math.abs(pin.W - it.w) < 0.01) || (Math.abs(pin.L - it.w) < 0.01 && Math.abs(pin.W - it.l) < 0.01))) { it.pin = pin; pinned.push(it); return; }
    fits.push(it);
  });

  const P = []; // placed: x,y,z,L,W,H (L,W include gap)
  let pts = [{ x: 0, y: 0, z: 0 }], seen = new Set(['0,0,0']);
  let barrier = 0, curGrp = null, grpMax = 0; const RS = [];
  const rThick = gr => (R.restraints && +R.restraints[gr]) || 0;
  const ov = (a0, a1, b0, b1) => a0 < b1 - E && b0 < a1 - E;
  function collide(x, y, z, L, W, H) {
    for (const b of P) if (ov(x, x + L, b.x, b.x + b.L) && ov(y, y + W, b.y, b.y + b.W) && ov(z, z + H, b.z, b.z + b.H)) return true;
    return false;
  }
  function supportOf(x, y, z, L, W, it) {
    if (z < E) return { ok: true, on: [], level: 1, cap: it.maxStack };
    if (it.sitOn === 'floor') return { ok: false };
    let area = 0; const on = [];
    for (const b of P) {
      if (Math.abs(b.z + b.H - z) > E) continue;
      const ox = Math.min(x + L - g, b.x + b.L - g) - Math.max(x, b.x), oy = Math.min(y + W - g, b.y + b.W - g) - Math.max(y, b.y);
      if (ox <= E || oy <= E) continue;
      if (!b.it.stack) return { ok: false };
      if (it.sitOn === 'same' && (b.it.type !== it.type || Math.abs(b.x - x) > E || Math.abs(b.y - y) > E || Math.abs(b.L - L) > E || Math.abs(b.W - W) > E)) return { ok: false };
      if (R.heavyBottom && it.wt != null && b.it.wt != null && b.it.wt < it.wt) return { ok: false };
      area += ox * oy; on.push(b);
    }
    const level = 1 + Math.max.apply(null, on.map(b => b.level)), cap = Math.min(it.maxStack, ...on.map(b => b.cap));
    return { ok: area >= R.support * (L - g) * (W - g) - E && level <= cap, on, level, cap };
  }
  function addPt(x, y, z) {
    if (x >= TL - E || y >= TW - E || z >= TH - E) return;
    const k = x.toFixed(2) + ',' + y.toFixed(2) + ',' + z.toFixed(2);
    if (seen.has(k)) return; seen.add(k); pts.push({ x, y, z });
  }
  function projY(x, y, z) { let ny = 0; for (const b of P) if (b.y + b.W <= y + E && x >= b.x - E && x < b.x + b.L - E && z >= b.z - E && z < b.z + b.H - E) ny = Math.max(ny, b.y + b.W); return ny; }
  function projX(x, y, z) { let nx = barrier; for (const b of P) if (b.x + b.L <= x + E && y >= b.y - E && y < b.y + b.W - E && z >= b.z - E && z < b.z + b.H - E) nx = Math.max(nx, b.x + b.L); return Math.min(nx, x); }
  function projZ(x, y, z) { let nz = 0; for (const b of P) if (b.z + b.H <= z + E && x >= b.x - E && x < b.x + b.L - E && y >= b.y - E && y < b.y + b.W - E) nz = Math.max(nz, b.z + b.H); return nz; }

  // Hand-placed (pinned) cases go in first, exactly where they were put; invalid pins fall back to auto.
  pinned.sort((a, b) => a.pin.z - b.pin.z);
  for (const it of pinned) {
    const p = it.pin, L = p.L + g, W = p.W + g;
    const ok = p.x >= -E && p.y >= -E && p.z >= -E && p.x + p.L <= truck.L + E && p.y + p.W <= truck.W + E && p.z + it.h <= truck.H + E && !collide(p.x, p.y, p.z, L, W, it.h);
    const on = ok && p.z > E ? P.filter(b => Math.abs(b.z + b.H - p.z) < 0.05 && ov(p.x, p.x + p.L, b.x, b.x + b.L - g) && ov(p.y, p.y + p.W, b.y, b.y + b.W - g)) : [];
    if (!ok || (p.z > E && !on.length)) { fits.push(it); continue; }
    const level = on.length ? 1 + Math.max(...on.map(b => b.level)) : 1, cap = Math.min(it.maxStack, ...on.map(b => b.cap));
    P.push({ x: p.x, y: p.y, z: p.z, L, W, H: it.h, l: p.L, w: p.W, it, on, level, cap, pinned: true });
    grpMax = Math.max(grpMax, p.x + L);
  }
  const hasPins = P.length > 0;
  for (const b of P) { const { x, y, z, L, W, H } = b; addPt(x + L, y, z); addPt(x, y + W, z); addPt(x, y, z + H); addPt(x + L, projY(x + L, y, z), z); addPt(projX(x, y + W, z), y + W, z); addPt(x + L, 0, 0); }
  pts = pts.filter(q => !P.some(c => q.x >= c.x - E && q.x < c.x + c.L - E && q.y >= c.y - E && q.y < c.y + c.W - E && q.z >= c.z - E && q.z < c.z + c.H - E));
  fits.sort((a, b) => a.grp - b.grp || (b.l * b.w) - (a.l * a.w) || b.h - a.h || (b.wt || 0) - (a.wt || 0) || (a.type > b.type ? 1 : a.type < b.type ? -1 : 0) || a.idx - b.idx);
  let loadWt = P.reduce((a, b) => a + (b.it.wt || 0), 0);
  for (const it of fits) {
    if (R.payloadCap > 0 && it.capped && it.wt && loadWt + it.wt > R.payloadCap) { unplaced.push({ item: it, reason: 'Over this truck’s payload' }); continue; }
    if (!hasPins && curGrp !== null && it.grp !== curGrp) {
      const th = rThick(curGrp);
      if (th > 0 && P.some(b => b.it.grp === curGrp)) { RS.push({ grp: curGrp, x: grpMax, thick: th }); barrier = grpMax + th; addPt(barrier, 0, 0); }
      else if (R.strictGroups) { barrier = grpMax; addPt(barrier, 0, 0); }
    }
    curGrp = it.grp;
    pts.sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
    const ors = [[it.l, it.w]];
    if (it.rot && Math.abs(it.l - it.w) > E) ors.push([it.w, it.l]);
    let best = null;
    for (const p of pts) {
      if (p.x < barrier - E) continue;
      if (best && p.x > best.p.x + E) break;
      for (const [l, w] of ors) {
        const L = l + g, W = w + g, H = it.h;
        if (p.x + L > TL + E || p.y + W > TW + E || p.z + H > TH + E) continue;
        if (collide(p.x, p.y, p.z, L, W, H)) continue;
        const s = supportOf(p.x, p.y, p.z, L, W, it);
        if (!s.ok) continue;
        const score = [p.x, p.z, p.y, p.x + L];
        if (!best || score[0] < best.s[0] - E || (Math.abs(score[0] - best.s[0]) <= E && (score[1] < best.s[1] - E || (Math.abs(score[1] - best.s[1]) <= E && (score[2] < best.s[2] - E || (Math.abs(score[2] - best.s[2]) <= E && score[3] < best.s[3] - E))))))
          best = { p, L, W, H, l, w, on: s.on, level: s.level, cap: s.cap, s: score };
      }
    }
    if (!best) { unplaced.push({ item: it, reason: 'No room left in the truck' }); continue; }
    const b = { x: best.p.x, y: best.p.y, z: best.p.z, L: best.L, W: best.W, H: best.H, l: best.l, w: best.w, it, on: best.on, level: best.level, cap: best.cap };
    P.push(b); loadWt += it.wt || 0;
    grpMax = Math.max(grpMax, b.x + b.L);
    const { x, y, z, L, W, H } = b;
    addPt(x + L, y, z); addPt(x, y + W, z); addPt(x, y, z + H);
    addPt(x + L, projY(x + L, y, z), z); addPt(projX(x, y + W, z), y + W, z);
    addPt(x + L, y, projZ(x + L, y, z)); addPt(x, y + W, projZ(x, y + W, z));
    addPt(projX(x, y, z + H), y, z + H); addPt(x, projY(x, y, z + H), z + H);
    pts = pts.filter(q => !P.some(c => q.x >= c.x - E && q.x < c.x + c.L - E && q.y >= c.y - E && q.y < c.y + c.W - E && q.z >= c.z - E && q.z < c.z + c.H - E));
  }

  if (hasPins) {
    // Hand-adjusted layout: put each restraint right behind its group and check the next group leaves room.
    [...new Set(P.map(b => b.it.grp))].sort((a, b) => a - b).forEach(gr => {
      const th = rThick(gr); if (!th) return;
      const x = P.reduce((m, b) => b.it.grp <= gr ? Math.max(m, b.x + b.L) : m, 0);
      const next = P.reduce((m, b) => b.it.grp > gr ? Math.min(m, b.x) : m, Infinity);
      RS.push({ grp: gr, x, thick: th, blocked: next < x + th - E });
    });
  } else if (curGrp !== null && rThick(curGrp) > 0 && P.some(b => b.it.grp === curGrp)) RS.push({ grp: curGrp, x: grpMax, thick: rThick(curGrp) });
  RS.forEach(r => { r.x = Math.max(0, r.x - g); r.faceH = P.reduce((m, b) => b.it.grp <= r.grp && b.x + b.L >= r.x - 6 ? Math.max(m, b.z + b.H) : m, 0); r.fits = !r.blocked && r.x + r.thick <= truck.L + E; });
  // Loading sequence: a case is loaded only after everything it rests on; otherwise nose first, then low, then driver side.
  const done = new Set(), seq = [];
  while (seq.length < P.length) {
    let pick = null;
    for (const b of P) {
      if (done.has(b) || !b.on.every(s => done.has(s))) continue;
      if (!pick || b.x < pick.x - 0.5 || (Math.abs(b.x - pick.x) <= 0.5 && (b.z < pick.z - E || (Math.abs(b.z - pick.z) <= E && b.y < pick.y)))) pick = b;
    }
    done.add(pick); seq.push(pick);
  }
  seq.forEach((b, i) => b.seq = i + 1);
  let wt = 0, wx = 0, wy = 0, vol = 0, usedL = 0, known = 0;
  const out = seq.map(b => {
    const w = b.it.wt || 0; if (b.it.wt != null) known++;
    wt += w; wx += w * (b.x + (b.L - g) / 2); wy += w * (b.y + (b.W - g) / 2);
    vol += (b.L - g) * (b.W - g) * b.H; usedL = Math.max(usedL, b.x + b.L - g);
    return { seq: b.seq, type: b.it.type, idx: b.it.idx, of: b.it.of, x: b.x, y: b.y, z: b.z, L: b.L - g, W: b.W - g, H: b.H, wt: b.it.wt, rotated: Math.abs(b.l - b.it.l) > E, on: b.on.map(s => s.seq), level: b.level, pinned: !!b.pinned, stack: b.it.stack, grp: b.it.grp };
  });
  return {
    placed: out,
    restraints: RS,
    unplaced: unplaced.map(u => ({ type: u.item.type, idx: u.item.idx, reason: u.reason })),
    stats: { count: out.length, total: items.length, weight: wt, weightKnown: known, cgX: wt ? wx / wt : null, cgY: wt ? wy / wt : null, volume: vol, truckVol: truck.L * truck.W * truck.H, usedL }
  };
}
if (typeof module !== 'undefined') module.exports = { packTruck };
