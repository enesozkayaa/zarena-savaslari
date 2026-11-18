// =============================================================
// Zarena Savaşları - oyun sesleri (hepsi kodla üretilir, dosya yok)
// =============================================================

const Ses = (() => {
  let ctx = null, ana = null, acik = true;
  try { acik = localStorage.getItem('zs.ses') !== '0'; } catch (e) { }
  function baslat() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); ana = ctx.createGain(); ana.gain.value = acik ? 0.5 : 0; ana.connect(ctx.destination); } catch (e) { return; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function degistir() { acik = !acik; if (ana) ana.gain.value = acik ? 0.5 : 0; try { localStorage.setItem('zs.ses', acik ? '1' : '0'); } catch (e) { } return acik; }
  function ton(f, sure, tip = 'sine', ses = 0.3, f2 = null, gecikme = 0) {
    if (!ctx || !acik) return;
    const t = ctx.currentTime + gecikme, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tip; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + sure);
    g.gain.setValueAtTime(ses, t); g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    o.connect(g).connect(ana); o.start(t); o.stop(t + sure + 0.02);
  }
  let gurultuB = null;
  function gurultu(sure, ses = 0.3, fGecis = 1200, tip = 'bandpass', gecikme = 0, q = 1) {
    if (!ctx || !acik) return;
    if (!gurultuB) { gurultuB = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = gurultuB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = ctx.currentTime + gecikme, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = gurultuB; f.type = tip; f.frequency.value = fGecis; f.Q.value = q;
    g.gain.setValueAtTime(ses, t); g.gain.exponentialRampToValueAtTime(0.001, t + sure);
    s.connect(f).connect(g).connect(ana); s.start(t, Math.random() * 0.5); s.stop(t + sure + 0.02);
  }
  return {
    baslat, degistir, get acik() { return acik; },
    zar() { for (let i = 0; i < 6; i++) gurultu(0.05, 0.25, 2500 + Math.random() * 1500, 'bandpass', i * 0.07, 4); ton(900, 0.05, 'square', 0.04, null, 0.45); },
    zarDus() { gurultu(0.08, 0.35, 1800, 'bandpass', 0, 3); ton(520, 0.08, 'triangle', 0.15); },
    cik() { ton(520, 0.12, 'sine', 0.12, 880); gurultu(0.15, 0.08, 3000, 'highpass'); },
    sec() { ton(660, 0.08, 'triangle', 0.2); ton(990, 0.12, 'triangle', 0.18, null, 0.07); },
    kotuSec() { ton(300, 0.25, 'sawtooth', 0.12, 150); },
    sira() { ton(880, 0.1, 'sine', 0.25); ton(1320, 0.18, 'sine', 0.22, null, 0.1); },
    tik() { ton(1200, 0.04, 'square', 0.08); },
    savur(agir) { gurultu(0.18, 0.22, agir ? 500 : 1100, 'bandpass', 0, 1.5); },
    atis(tur) { if (tur === 'ates') { gurultu(0.4, 0.3, 600, 'lowpass'); ton(200, 0.3, 'sawtooth', 0.08, 80); } else if (tur === 'domates') ton(400, 0.1, 'sine', 0.15, 250); else { ton(tur === 'ok' ? 180 : 300, 0.12, 'triangle', 0.2, 90); gurultu(0.08, 0.15, 2500); } },
    vur(siddet = 1) { gurultu(0.12, 0.35 * siddet, 300, 'lowpass'); ton(140, 0.12, 'sine', 0.3 * siddet, 60); },
    blok() { ton(1500, 0.18, 'square', 0.08, 1300); ton(2300, 0.12, 'triangle', 0.06); gurultu(0.06, 0.2, 4000, 'highpass'); },
    sicrat() { gurultu(0.15, 0.3, 900, 'lowpass'); },
    olum() { ton(400, 0.6, 'sawtooth', 0.15, 80); gurultu(0.3, 0.3, 400, 'lowpass', 0.05); },
    guc(tur) { const f = { mana: 520, hiz: 780, can: 660, koruma: 440 }[tur] || 600; [0, 0.08, 0.16].forEach((g, i) => ton(f * (1 + i * 0.25), 0.15, 'sine', 0.2, null, g)); },
    alan() { ton(220, 0.5, 'sawtooth', 0.12); ton(220, 0.5, 'sawtooth', 0.12, null, 0.6); },
    yanik() { ton(180, 0.1, 'square', 0.06, 120); },
    gong() { ton(110, 1.6, 'sine', 0.4); ton(220, 1.2, 'triangle', 0.15); ton(330, 0.9, 'sine', 0.08); },
    alkis() { for (let i = 0; i < 30; i++) gurultu(0.04, 0.12, 1500 + Math.random() * 1500, 'bandpass', Math.random() * 1.6, 2); },
    kazandi() { [523, 659, 784, 1046].forEach((f, i) => ton(f, 0.35, 'triangle', 0.22, null, i * 0.13)); },
    kaybetti() { [392, 330, 262].forEach((f, i) => ton(f, 0.4, 'triangle', 0.2, null, i * 0.18)); },
  };
})();
