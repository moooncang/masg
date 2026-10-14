// 공용 유틸
window.U = {
  rand(a, b) { return a + Math.random() * (b - a); },
  randInt(a, b) { return Math.floor(U.rand(a, b + 1)); },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  pickWeighted(arr, key = "weight") {
    const total = arr.reduce((s, x) => s + (x[key] || 1), 0);
    let r = Math.random() * total;
    for (const x of arr) { r -= (x[key] || 1); if (r <= 0) return x; }
    return arr[arr.length - 1];
  },
  clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  lerp(a, b, t) { return a + (b - a) * t; },
  uid() { return Math.random().toString(36).slice(2, 9); },
  fmtMoney(c) {
    const g = Math.floor(c / 1000), s = Math.floor((c % 1000) / 100), d = Math.floor(c % 100);
    const parts = [];
    if (g) parts.push(`금 ${g}`);
    if (s || g) parts.push(`은 ${s}`);
    parts.push(`동 ${d}`);
    return parts.join(" ");
  },
  // 0 인 단위는 생략: 금 5 / 금 1 은 2 / 은 3
  fmtMoneyShort(c) {
    const g = Math.floor(c / 1000), sv = Math.floor((c % 1000) / 100), d = Math.floor(c % 100), parts = [];
    if (g) parts.push(`금 ${g}`); if (sv) parts.push(`은 ${sv}`); if (d || !parts.length) parts.push(`동 ${d}`);
    return parts.join(" ");
  },
  fmtClock(min) {
    const h = Math.floor(min / 60), m = Math.floor(min % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  },
  repTier(rep) {
    let t = CONFIG.REP_TIERS[0];
    for (const x of CONFIG.REP_TIERS) if (rep >= x.min) t = x;
    return t;
  },
  relTier(v) {
    let t = RELATION_TIERS[0];
    for (const x of RELATION_TIERS) if (v >= x.min) t = x;
    return t;
  },
  grade(score) {
    if (score >= CONFIG.GRADE.S) return "S";
    if (score >= CONFIG.GRADE.A) return "A";
    if (score >= CONFIG.GRADE.B) return "B";
    return "C";
  },
};
