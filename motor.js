// =============================================================
// Zarena Savaşları - OYUN MOTORU (sadece odayı açan "ev" çalıştırır)
// Akış: zar at → sırayla eşya seç (birkaç tur) → arenada savaş → puan → yeni seçim …
// Botları da burada yönetir. Node'da da çalışır (testler için).
// =============================================================

const Motor = (() => {
  const E = (typeof Esya !== 'undefined') ? Esya : require('./esyalar.js');
  const ADIM = 0.05;                 // 20 kez / saniye
  const SECIM_SURE = 10;             // bir eşya seçmek için saniye
  const ZAR_SURE = 10;               // zarını atmak için saniye (atmayanınki kendiliğinden atılır)
  const ZAR_GOSTER = 3.2;            // son zar düştükten sonra sıra gösterilir, sonra eşyalar çıkar
  const ZAR_ESIT = 2.2;              // "eşit!" yazısı
  const KARAR_SURE = 10;             // arenadan önce "yenisini giy / eskisini koru" için bekleme
  const GERI = 3;                    // arena geri sayımı
  const ALAN_BAS = 40, ALAN_SURE = 45, ALAN_MIN = 2.5;   // alan 40. saniyede daralmaya başlar, 45 saniyede küçülür
  const HIZ_TEMEL = 4.2, OYUNCU_R = 0.45, SUTUN_R = 0.9;
  const HASAR_CARPAN = 0.6;          // bütün hasarlar bununla çarpılır (kavgalar uzasın)
  const GUC_TUR = ['mana', 'hiz', 'can', 'koruma'];
  const GUC_SURE = { mana: 8, hiz: 6, koruma: 6 };

  let M = null, sayac = null, geri = null, rnd = Math.random;
  const yolla = m => geri && geri.herkese(m);

  // Lobide açılıp kapatılan ekstra özellikler
  const OZ_ADLAR = ['tuzak', 'ozel', 'set', 'sandik', 'seyirci', 'takim', 'joker'];
  const ozDuzelt = oz => Object.fromEntries(OZ_ADLAR.map(k => [k, !!(oz && oz[k])]));
  const kapaliEtkin = () => M.ayar.oz.ozel ? M.ayar.kapali : [...M.ayar.kapali, ...E.OZEL_IDLER];
  // Takım modu: çift numaralılar 🔴, tek numaralılar 🔵
  const takimli = () => !!M.ayar.oz.takim;
  const dost = (a, b) => takimli() && a !== b && a.takim === b.takim;
  function puanVer(p, n) { if (takimli()) M.oyuncular.forEach(o => { if (o.takim === p.takim) o.puan += n; }); else p.puan += n; }

  function baslat(liste, ayar, g, secenek = {}) {
    durdur();
    geri = g; rnd = secenek.rastgele || Math.random;
    M = {
      ayar: { hedef: ayar.hedef || 5, guc: ayar.guc || {}, secimSure: +ayar.secimSure || SECIM_SURE, zarSure: +ayar.zarSure || ZAR_SURE, kararSure: +ayar.kararSure || KARAR_SURE, turSay: +ayar.turSay || 5, kapali: Array.isArray(ayar.kapali) ? ayar.kapali.slice() : [], oz: ozDuzelt(ayar.oz) },
      oyuncular: liste.map((p, i) => ({ no: i, id: p.id, ad: p.ad, bot: !!p.bot, renk: p.renk ?? i, ten: p.ten ?? (i % 5), puan: 0, kusam: {}, takim: p.takim === 0 || p.takim === 1 ? p.takim : i % 2 })),
      faz: 'bos', draftNo: 0, t: 0, tick: 0,
    };
    E.setAc(M.ayar.oz.set);
    yolla({ tip: 'basla', oyuncular: M.oyuncular.map(o => ({ no: o.no, id: o.id, ad: o.ad, bot: o.bot, renk: o.renk, ten: o.ten, takim: o.takim })), ayar: M.ayar });
    draftBaslat();
    if (!secenek.elle) {
      let son = Date.now(), birikim = 0;
      sayac = setInterval(() => {
        const simdi = Date.now(); birikim += Math.min(3, (simdi - son) / 1000); son = simdi;
        let n = 0;
        while (birikim >= ADIM && n++ < 80) { adim(ADIM); birikim -= ADIM; }
      }, ADIM * 1000);
    }
    return M;
  }
  function durdur() { if (sayac) clearInterval(sayac); sayac = null; M = null; }

  // ================= EŞYA SEÇİMİ =================
  function draftBaslat() {
    M.draftNo++;
    M.oyuncular.forEach(o => { o.kusam = {}; o.kararlar = []; });
    M.d = { turlar: E.draftHazirla(M.oyuncular.length, rnd, M.ayar.turSay, kapaliEtkin()), tur: 0 };
    M.arena = null;
    turBaslat();
  }
  // Oda sahibi oyun sırasında eşya açıp kapattı: henüz masaya çıkmamış turlar hemen yeniden hazırlanır
  function kapaliGuncelle(liste) {
    if (!M) return 0;
    M.ayar.kapali = Array.isArray(liste) ? liste.filter(id => E.al(id)) : [];
    const d = M.d;
    if (!d || M.arena) return 0;                   // arenadaysa: sonraki eşya seçimi zaten yeni listeyle başlar
    const ilk = d.tur + 1;                          // şu anki tur masada (ya da zarı atılıyor); sonrakiler değişir
    const kalan = d.turlar.length - ilk;
    if (kalan <= 0) return 0;
    const kullanilan = d.turlar.slice(0, ilk).flat();
    const kapat = [...new Set([...kapaliEtkin(), ...kullanilan])];
    // kullanılmamış açık eşya kalmadıysa sadece kapalıları dışarıda bırak (tekrar çıkabilir)
    const acikKalan = E.LISTE.filter(x => !kapat.includes(x.id)).length;
    const yeni = E.draftHazirla(M.oyuncular.length, rnd, kalan, acikKalan >= M.oyuncular.length ? kapat : kapaliEtkin());
    d.turlar.splice(ilk, kalan, ...yeni);
    return kalan;
  }
  // Zarı atar. Eşit atanlar sadece kendi aralarında yeniden atar.
  function siralama(nolar) {
    const asamalar = [];
    let gruplar = [nolar.slice()], ilk = true;
    for (let g = 0; g < 30; g++) {
      const asama = {}, yeni = [];
      let atildi = false;
      for (const grup of gruplar) {
        if (grup.length === 1 && !ilk) { yeni.push(grup); continue; }
        grup.forEach(no => { asama[no] = 1 + Math.floor(rnd() * 6); });
        atildi = true;
        [...new Set(grup.map(no => asama[no]))].sort((a, b) => b - a).forEach(d => yeni.push(grup.filter(no => asama[no] === d)));
      }
      if (!atildi) break;
      asamalar.push(asama); gruplar = yeni; ilk = false;
      if (gruplar.every(x => x.length === 1)) break;
    }
    return { asamalar, sira: gruplar.flat() };
  }
  // Zar: herkes kendi zarını atar (süre içinde). Eşit atanlar sadece kendi aralarında yeniden atar.
  function turBaslat() {
    const d = M.d;
    const hepsi = M.oyuncular.map(o => o.no);
    Object.assign(d, { esyalar: d.turlar[d.tur], alinan: {}, asamalar: [{}], gruplar: [hepsi], bekleyen: hepsi.slice(), sira: null, siraIdx: 0, son: null, sonZar: null, esit: null, ekstra: null });
    zarBekle();
  }
  function zarBekle() {
    M.faz = 'zar'; M.sayac = M.ayar.zarSure;
    M.d.bekleyen.forEach(no => { const p = M.oyuncular[no]; p.botZar = p.bot ? 0.6 + rnd() * 2.4 : null; });
    draftYolla();
  }
  function zarAt(no) {
    const d = M.d;
    if (M.faz !== 'zar' || !d.bekleyen.includes(no)) return false;
    const v = 1 + Math.floor(rnd() * 6), a = d.asamalar.length - 1;
    d.asamalar[a][no] = v;
    if (M.ayar.oz.joker && a === 0 && v === 6) { const p = M.oyuncular[no]; p.joker = Math.min(2, (p.joker || 0) + 1); }
    d.bekleyen = d.bekleyen.filter(x => x !== no);
    d.sonZar = { no, v, a };
    if (!d.bekleyen.length) asamaBitti();
    else draftYolla();
    return true;
  }
  function asamaBitti() {
    const d = M.d, a = d.asamalar[d.asamalar.length - 1], yeni = [];
    d.gruplar.forEach(g => {
      if (g.length === 1) { yeni.push(g); return; }
      [...new Set(g.map(no => a[no]))].sort((x, y) => y - x).forEach(v => yeni.push(g.filter(no => a[no] === v)));
    });
    d.gruplar = yeni;
    if (yeni.every(g => g.length === 1)) {
      d.sira = yeni.flat();
      M.faz = 'zarBitti'; M.sayac = ZAR_GOSTER;       // zarlar biraz görünür, sonra eşyalar çıkar
    } else {
      d.esit = yeni.filter(g => g.length > 1).map(g => g.slice());
      d.asamalar.push({});
      d.bekleyen = yeni.filter(g => g.length > 1).flat();
      M.faz = 'zarEsit'; M.sayac = ZAR_ESIT;
    }
    draftYolla();
  }
  const kalanlar = () => M.d.esyalar.map((id, i) => i).filter(i => M.d.alinan[i] === undefined);
  function siradakiBasla() {
    const d = M.d, no = d.sira[d.siraIdx], p = M.oyuncular[no], kalan = kalanlar();
    M.faz = 'secim';
    M.sayac = kalan.length === 1 ? 0.7 : M.ayar.secimSure;
    p.botSec = null;
    if (p.bot && p.joker > 0 && kalan.length >= 3 && d.ekstra == null && rnd() < 0.6) { p.joker--; d.ekstra = no; }
    if (p.bot || kalan.length === 1) {
      let en = kalan[0], enD = -1e9;
      kalan.forEach(i => { const v = E.deger(d.esyalar[i], p.kusam) + rnd() * 2; if (v > enD) { enD = v; en = i; } });
      p.botSec = { i: en, t: kalan.length === 1 ? 0.6 : 0.9 + rnd() * 1.6 };
    }
    draftYolla();
  }
  function sec(no, i, oto) {
    const d = M.d;
    if (M.faz !== 'secim' || d.sira[d.siraIdx] !== no || d.alinan[i] !== undefined || i < 0 || i >= d.esyalar.length) return false;
    d.alinan[i] = no;
    const x = E.al(d.esyalar[i]), p = M.oyuncular[no];
    // Yuva boşsa hemen giyer. Doluysa oyuncu seçer: "yenisini giy" ya da "eskisini koru" (arena başlayana kadar)
    if (!p.kusam[x.yuva]) p.kusam[x.yuva] = x.id;
    else if (p.bot) { if (x.p > E.al(p.kusam[x.yuva]).p) p.kusam[x.yuva] = x.id; }
    else p.kararlar.push(x.id);
    d.son = { no, i, oto: !!oto };
    if (d.ekstra === no && kalanlar().length) { d.ekstra = null; siradakiBasla(); return true; }   // 🃏 joker: bir eşya daha seçer
    d.ekstra = null;
    d.siraIdx++;
    if (d.siraIdx >= d.sira.length || !kalanlar().length) {
      d.tur++;
      M.faz = 'bekle';
      M.sayac = 1.6;
      M.sonraki = d.tur < d.turlar.length ? 'tur' : 'arena';
      draftYolla();
    } else siradakiBasla();
    return true;
  }
  function draftYolla() {
    const d = M.d;
    yolla({
      tip: 'draft', faz: M.faz, tur: d.tur, turSay: d.turlar.length, esyalar: d.esyalar, alinan: d.alinan, asamalar: d.asamalar, sira: d.sira,
      bekleyen: d.bekleyen, sonZar: d.sonZar, esit: d.esit || null, kararlar: M.oyuncular.map(o => o.kararlar || []),
      sureTop: M.faz === 'secim' ? M.ayar.secimSure : M.faz === 'zar' ? M.ayar.zarSure : M.faz === 'kararBekle' ? M.ayar.kararSure : 0,
      siraIdx: d.siraIdx, sure: M.sayac, son: d.son, kusam: M.oyuncular.map(o => o.kusam), sonraki: M.sonraki || null, draftNo: M.draftNo,
      joker: M.oyuncular.map(o => o.joker || 0), ekstra: d.ekstra ?? null,
    });
  }
  // Eşyaların masadaki yeri (masa ortası 0,0; oyuncular -z tarafında, kamera +z tarafında)
  function esyaYeri(i, n) {
    const sut = n <= 5 ? n : Math.ceil(n / 2), sat = Math.ceil(n / sut);
    const r = Math.floor(i / sut), c = i % sut, buSat = r === sat - 1 ? n - sut * (sat - 1) : sut;
    return { x: (c - (buSat - 1) / 2) * 1.3, z: sat === 1 ? 0.1 : (r === 0 ? -0.5 : 0.65) };
  }
  function draftAdim(dt) {
    M.sayac -= dt;
    const d = M.d;
    if (M.faz === 'zar') {
      d.bekleyen.slice().forEach(no => { const p = M.oyuncular[no]; if (p.botZar != null) { p.botZar -= dt; if (p.botZar <= 0) { p.botZar = null; zarAt(no); } } });
      if (M.faz === 'zar' && M.sayac <= 0) d.bekleyen.slice().forEach(no => zarAt(no));   // süre bitti: kendiliğinden atılır
    }
    else if (M.faz === 'zarEsit') { if (M.sayac <= 0) zarBekle(); }
    else if (M.faz === 'zarBitti') { if (M.sayac <= 0) siradakiBasla(); }
    else if (M.faz === 'secim') {
      const no = d.sira[d.siraIdx], p = M.oyuncular[no];
      if (p.botSec) {
        p.botSec.t -= dt;
        // botun imleci seçeceği karta doğru kayar
        const h = esyaYeri(p.botSec.i, d.esyalar.length);
        p.imlec = p.imlec || { x: 0, z: -1.6 };
        p.imlec.x += (h.x - p.imlec.x) * Math.min(1, dt * 5); p.imlec.z += (h.z - p.imlec.z) * Math.min(1, dt * 5); p.imlecT = M.t;
        if (p.botSec.t <= 0) { sec(no, p.botSec.i, false); return; }
      }
      if (M.sayac <= 0) sec(no, kalanlar().reduce((a, i) => (E.al(d.esyalar[i]).p < E.al(d.esyalar[a]).p ? i : a)), true);
    } else if (M.faz === 'bekle') {
      if (M.sayac <= 0) {
        if (M.sonraki === 'tur') { turBaslat(); M.sonraki = null; }
        else if (kararBekleyen()) { M.faz = 'kararBekle'; M.sayac = M.ayar.kararSure; draftYolla(); }   // karar vermeyen var: arena bekler
        else { arenaBaslat(); M.sonraki = null; }
      }
    } else if (M.faz === 'kararBekle') {
      if (M.sayac <= 0 || !kararBekleyen()) { arenaBaslat(); M.sonraki = null; }
    }
    // İmleçleri gönder
    if (M.tick % 3 === 0) {
      const l = M.oyuncular.filter(o => o.imlec && M.t - (o.imlecT || 0) < 6).map(o => [o.no, +o.imlec.x.toFixed(2), +o.imlec.z.toFixed(2)]);
      if (l.length) yolla({ tip: 'im', l });
    }
  }

  // ================= ARENA =================
  // Karar verilmeyen eşyalar: iyi olanı otomatik giyilir
  function kararlariBitir() {
    M.oyuncular.forEach(p => {
      (p.kararlar || []).forEach(id => { const x = E.al(id), eski = E.al(p.kusam[x.yuva]); if (!eski || x.p > eski.p) p.kusam[x.yuva] = id; });
      p.kararlar = [];
    });
  }
  const kararBekleyen = () => M.oyuncular.some(p => !p.bot && (p.kararlar || []).length);
  function karar(p, id, giy) {
    const k = (p.kararlar || []).indexOf(id);
    if (k < 0) return;
    p.kararlar.splice(k, 1);
    if (giy) p.kusam[E.al(id).yuva] = id;
    if (M.d && !M.arena) { if (M.faz === 'kararBekle' && !kararBekleyen()) M.sayac = Math.min(M.sayac, 0.6); draftYolla(); }
  }
  function arenaBaslat() {
    kararlariBitir();
    const n = M.oyuncular.length, R = arenaR(n);
    const sutunlar = [0, 1, 2, 3].map(k => { const a = Math.PI / 4 + k * Math.PI / 2; return { x: Math.sin(a) * R * 0.5, z: Math.cos(a) * R * 0.5, r: SUTUN_R }; });
    if (R >= 18) [0, 1, 2, 3].forEach(k => { const a = Math.PI / 8 + k * Math.PI / 2; sutunlar.push({ x: Math.sin(a) * R * 0.74, z: Math.cos(a) * R * 0.74, r: SUTUN_R }); });   // büyük arenada saklanacak ek sütunlar
    M.arena = { R, zr: R, sutunlar, t: 0, mermiler: [], guclar: [], mermiNo: 0, gucNo: 0, gucSayac: 4, olaylar: [], bitisSayac: -1, gucDegisti: true, yerde: [], yerNo: 0, yerDegisti: true,
      tuzak: M.ayar.oz.tuzak ? tuzakHazirla(R, sutunlar, n) : null, sandik: null, sandikNo: 0, sandikSayac: 12, sandikDegisti: false,
      oy: null, oySayac: 12, meteorlar: [], meteorNo: 0, meteorDegisti: false };
    M.oyuncular.forEach((o, i) => {
      let a = (i / n) * Math.PI * 2;
      if (takimli()) {   // takım arkadaşları yan yana, iki takım karşılıklı
        const uyeler = M.oyuncular.filter(x => x.takim === o.takim), k = uyeler.indexOf(o);
        a = o.takim * Math.PI + (k - (uyeler.length - 1) / 2) * 0.26;
      }
      const st = E.statlar(o.kusam);
      Object.assign(o, {
        st, x: Math.sin(a) * R * 0.78, z: Math.cos(a) * R * 0.78, yon: a + Math.PI, can: st.canMax, olu: false, cd: 0, blk: false, blkT: 0,
        manaT: 0, hizT: 0, korumaT: 0, sonVuran: -1, sonVuranT: -99, oldurme: 0, vx: 0, vz: 0, sonSaldiri: -9, hedefNo: -1, hedefT: 0, yan: rnd() < 0.5 ? 1 : -1, yanT: 0,
        tepki: 0.1 + rnd() * 0.25, cikti: o.cikti || false, yavasT: 0, dirildi: false, kacisOldu: false, bicakCd: 0, mvx: 0, mvz: 0, atesYak: 0,
      });
      if (o.cikti) o.olu = true;
    });
    M.faz = 'geri'; M.sayac = GERI;
    yolla({ tip: 'arena', R, sutunlar, oyuncular: M.oyuncular.map(o => ({ no: o.no, x: o.x, z: o.z, yon: o.yon, can: o.can, canMax: o.st.canMax, kusam: o.kusam })), guc: M.ayar.guc, tuzak: M.arena.tuzak });
  }
  // Arena yarıçapı (eskiden 10 + n idi; daha geniş alan)
  function arenaR(n) { return +(14 + n * 1.3).toFixed(1); }
  const aktifGuclar = () => GUC_TUR.filter(k => M.ayar.guc[k]);
  // ---------- Tuzaklı arena ----------
  const ATES_DONGU = 6, ATES_UYARI = 3.6, ATES_YANAR = 4.8, ATES_R = 1.15;
  function tuzakHazirla(R, sutunlar, n) {
    const tur = ['bicak', 'ates'][Math.floor(rnd() * 2)];   // buzlu arena çıkarıldı (çok kayıyordu)
    const t = { tur };
    if (tur === 'bicak') { t.hiz = 0.75; t.L = +(R * 0.42).toFixed(2); }
    if (tur === 'ates') {
      t.ventler = [];
      for (let k = 0; k < 200 && t.ventler.length < 5 + Math.floor(n / 3); k++) {
        const a = rnd() * Math.PI * 2, r = 2 + rnd() * (R - 4), x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (sutunlar.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 1.6)) continue;
        if (t.ventler.some(v => Math.hypot(v.x - x, v.z - z) < 3)) continue;
        t.ventler.push({ x: +x.toFixed(2), z: +z.toFixed(2), faz: +(rnd() * ATES_DONGU).toFixed(2) });
      }
    }
    return t;
  }
  const atesDurum = (v, t) => { const f = (t + v.faz) % ATES_DONGU; return f < ATES_UYARI ? 0 : f < ATES_YANAR ? 1 : 2; };   // 0 sakin, 1 uyarı, 2 yanıyor
  // Saldıranı olmayan hasar (tuzak, meteor)
  function cevreHasar(q, miktar, ix, iz) {
    const A = M.arena;
    if (q.olu) return;
    let dmg = miktar * (1 - q.st.zirh) * (q.korumaT > 0 ? 0.5 : 1);
    dmg = Math.max(1, Math.round(dmg));
    q.can -= dmg;
    if (ix || iz) { if (q.bot) { q.vx += ix; q.vz += iz; } else A.olaylar.push(['it', q.no, +ix.toFixed(2), +iz.toFixed(2)]); }
    A.olaylar.push(['hit', q.no, dmg, 0, 0]);
    kacisKontrol(q);
    if (q.can <= 0) olum(q);
  }
  function tuzakAdim(dt) {
    const A = M.arena, T = A.tuzak;
    if (!T) return;
    if (T.tur === 'bicak') {
      const temel = A.t * T.hiz;
      M.oyuncular.forEach(p => {
        if (p.olu) return;
        p.bicakCd = Math.max(0, p.bicakCd - dt);
        if (p.bicakCd > 0) return;
        for (let k = 0; k < 2; k++) {
          const a = temel + k * Math.PI, dx = Math.sin(a), dz = Math.cos(a);
          const u = Math.max(0.5, Math.min(T.L, p.x * dx + p.z * dz));
          if (Math.hypot(p.x - dx * u, p.z - dz * u) < 0.55 + OYUNCU_R * 0.4) {
            p.bicakCd = 0.8;
            cevreHasar(p, 11, Math.cos(a) * 7, -Math.sin(a) * 7);
            A.olaylar.push(['tz', p.no]);
            break;
          }
        }
      });
    } else if (T.tur === 'ates') {
      M.oyuncular.forEach(p => {
        if (p.olu) return;
        const yaniyor = T.ventler.some(v => atesDurum(v, A.t) === 2 && Math.hypot(p.x - v.x, p.z - v.z) < ATES_R + OYUNCU_R * 0.5);
        if (!yaniyor) return;
        const yak = 18 * dt * (1 - p.st.zirh * 0.5);
        p.can -= yak; p.atesYak += yak;
        if (p.atesYak >= 3) { A.olaylar.push(['alanHit', p.no, Math.round(p.atesYak)]); p.atesYak = 0; }
        if (p.can <= 0) olum(p);
      });
    }
  }
  // ---------- Ödül sandığı ----------
  function sandikAdim(dt) {
    const A = M.arena;
    if (!A.sandik) {
      A.sandikSayac -= dt;
      if (A.sandikSayac > 0) return;
      for (let k = 0; k < 30; k++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * Math.max(1, Math.min(A.zr, A.R) * 0.6);
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        if (A.sutunlar.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 1)) continue;
        A.sandik = { id: ++A.sandikNo, x, z }; A.sandikDegisti = true; A.olaylar.push(['sd']);
        return;
      }
      A.sandikSayac = 2;
      return;
    }
    const p = M.oyuncular.find(o => !o.olu && Math.hypot(o.x - A.sandik.x, o.z - A.sandik.z) < 1.0);
    if (!p) return;
    const kapali = kapaliEtkin();
    let havuz = E.LISTE.filter(x => (x.yuva === 'silah' || x.yuva === 'kalkan') && x.p >= 8 && !kapali.includes(x.id));
    if (!havuz.length) havuz = E.LISTE.filter(x => (x.yuva === 'silah' || x.yuva === 'kalkan') && x.p >= 8);
    const x = havuz[Math.floor(rnd() * havuz.length)];
    A.yerde.push({ id: ++A.yerNo, esya: x.id, x: A.sandik.x, z: A.sandik.z }); A.yerDegisti = true;
    A.olaylar.push(['sa', p.no, x.id]);
    A.sandik = null; A.sandikDegisti = true; A.sandikSayac = 22;
  }
  // ---------- Seyirci oyu: ölenler arenayı etkiler ----------
  const OY_SECENEK = ['meteor', 'iksir', 'yavas', 'mana'];
  function oyAdim(dt, canliSay) {
    const A = M.arena;
    const oluler = M.oyuncular.filter(o => o.olu && !o.cikti);
    if (!A.oy) {
      if (!oluler.length || canliSay < 2) return;
      A.oySayac -= dt;
      if (A.oySayac > 0) return;
      const sec = OY_SECENEK.slice().sort(() => rnd() - 0.5).slice(0, 3);
      A.oy = { sec, t: 8, oylar: {} };
      oluler.forEach(o => { if (o.bot) o.oyT = 1 + rnd() * 4; });
      A.olaylar.push(['oy', sec, 8]);
      return;
    }
    A.oy.t -= dt;
    oluler.forEach(o => { if (o.bot && o.oyT != null && A.oy.oylar[o.no] === undefined) { o.oyT -= dt; if (o.oyT <= 0) oyVer(o, Math.floor(rnd() * 3)); } });
    if (A.oy.t <= 0) {
      const say = [0, 0, 0]; Object.values(A.oy.oylar).forEach(i => say[i]++);
      const en = Math.max(...say), adaylar = [0, 1, 2].filter(i => say[i] === en);
      const secim = A.oy.sec[adaylar[Math.floor(rnd() * adaylar.length)]];
      oyUygula(secim);
      A.olaylar.push(['oyS', secim, say]);
      A.oy = null; A.oySayac = 16;
    }
  }
  function oyVer(p, i) {
    const A = M.arena;
    if (!A.oy || !p.olu || !(i >= 0 && i <= 2)) return;
    A.oy.oylar[p.no] = i;
    const say = [0, 0, 0]; Object.values(A.oy.oylar).forEach(k => say[k]++);
    A.olaylar.push(['oyv', say]);
  }
  function oyUygula(secim) {
    const A = M.arena, canli = M.oyuncular.filter(o => !o.olu);
    if (secim === 'meteor') {
      for (let k = 0; k < 7; k++) {
        const h = canli[Math.floor(rnd() * canli.length)]; if (!h) break;
        const a = rnd() * Math.PI * 2, r = rnd() * 2.5;
        let x = h.x + Math.sin(a) * r, z = h.z + Math.cos(a) * r;
        const L = Math.hypot(x, z), s = A.R - 0.6; if (L > s) { x *= s / L; z *= s / L; }
        A.meteorlar.push({ id: ++A.meteorNo, x, z, t: 1.5 + k * 0.45 });
      }
      A.meteorDegisti = true;
    } else if (secim === 'iksir') {
      for (let k = 0; k < 3; k++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * Math.max(1, A.zr - 1.5);
        A.guclar.push({ id: ++A.gucNo, x: Math.sin(a) * r, z: Math.cos(a) * r, tur: 'can' });
      }
      A.gucDegisti = true;
    } else if (secim === 'yavas') canli.forEach(o => { o.yavasT = 5; });
    else if (secim === 'mana') canli.forEach(o => { o.manaT = 6; });
  }
  function meteorAdim(dt) {
    const A = M.arena;
    if (!A.meteorlar.length) return;
    A.meteorlar = A.meteorlar.filter(m => {
      m.t -= dt;
      if (m.t > 0) return true;
      A.olaylar.push(['met', +m.x.toFixed(2), +m.z.toFixed(2)]);
      M.oyuncular.forEach(q => {
        if (q.olu) return;
        const dx = q.x - m.x, dz = q.z - m.z, d = Math.hypot(dx, dz);
        if (d < 1.8) cevreHasar(q, 16, dx / (d || 1) * 7, dz / (d || 1) * 7);
      });
      A.meteorDegisti = true;
      return false;
    });
  }
  // Hayalet pelerini: canı azalınca bir kez hızlanır
  function kacisKontrol(q) {
    if (q.olu || q.can <= 0 || q.can >= 30 || q.kacisOldu) return;
    if (E.al(q.kusam.govde)?.ozel !== 'kacis') return;
    q.kacisOldu = true; q.hizT = Math.max(q.hizT, 3);
    M.arena.olaylar.push(['ozel', q.no, 'kacis']);
  }
  // Karpuz bombası: çarptığı yerde patlar
  function patla(m, vurulan) {
    const A = M.arena, sahip = M.oyuncular[m.sahip];
    A.olaylar.push(['pat', +m.x.toFixed(2), +m.z.toFixed(2)]);
    M.oyuncular.forEach(q => {
      if (q.olu || q === vurulan || q === sahip || dost(sahip, q)) return;
      const d = Math.hypot(q.x - m.x, q.z - m.z);
      if (d < 2.0) hasarVer(sahip, q, { ...m.s, hasar: m.s.hasar * 0.7, ozel: null }, m.mana, Math.atan2(q.x - m.x, q.z - m.z));
    });
  }
  function alanYaricap(t) {
    const R = M.arena.R;
    if (t < ALAN_BAS) return R;
    const sonra = t - ALAN_BAS - ALAN_SURE - 20;    // en küçük hâlde 20 sn bekler, sonra tamamen kapanır
    if (sonra > 0) return Math.max(0, ALAN_MIN - sonra * 0.25);
    return Math.max(ALAN_MIN, R - (R - ALAN_MIN) * Math.min(1, (t - ALAN_BAS) / ALAN_SURE));
  }
  const aci = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return Math.abs(d); };

  function saldiri(p, yon) {
    if (p.olu || p.cd > (p.bot ? 0 : 0.12) || M.faz !== 'savas') return;
    const s = p.st.silah, A = M.arena;
    p.yon = yon; p.cd = s.bekleme; p.sonSaldiri = A.t; p.blk = false;
    A.olaylar.push(['sv', p.no]);
    if (s.tur === 'atis') {
      const dx = Math.sin(yon), dz = Math.cos(yon);
      A.mermiler.push({ id: ++A.mermiNo, sahip: p.no, x: p.x + dx * 0.6, z: p.z + dz * 0.6, vx: dx * s.mhiz, vz: dz * s.mhiz, omur: s.menzil / s.mhiz, s, mana: p.manaT > 0, tur: s.mermi });
      return;
    }
    M.oyuncular.forEach(q => {
      if (q === p || q.olu || dost(p, q)) return;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d > s.menzil + OYUNCU_R) return;
      if (d > 0.9 && aci(Math.atan2(dx, dz), yon) > 1.15) return;
      if (sutunArasi(p.x, p.z, q.x, q.z)) return;
      hasarVer(p, q, s, p.manaT > 0, Math.atan2(dx, dz));
    });
  }
  function sutunArasi(x1, z1, x2, z2) {
    return M.arena.sutunlar.some(c => {
      const dx = x2 - x1, dz = z2 - z1, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((c.x - x1) * dx + (c.z - z1) * dz) / L2));
      return Math.hypot(x1 + dx * t - c.x, z1 + dz * t - c.z) < c.r;
    });
  }
  // a, q'ya vurdu. yon: vuruşun geldiği yön (a'dan q'ya)
  function hasarVer(a, q, s, mana, yon) {
    const A = M.arena;
    let dmg = s.hasar * HASAR_CARPAN * (mana ? 1.8 : 1) * (a.st?.hasarK || 1);
    const ham = dmg;
    const geldi = Math.atan2(a.x - q.x, a.z - q.z);
    const bloklu = q.blk && aci(q.yon, geldi) < 1.3;
    if (bloklu) dmg *= 1 - q.st.blok;
    dmg *= 1 - q.st.zirh;
    if (q.korumaT > 0) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg));
    q.can -= dmg;
    if (a.no !== q.no) { q.sonVuran = a.no; q.sonVuranT = A.t; }
    const itme = (s.itme || 2) * (bloklu ? 0.35 : 1) * (mana ? 1.6 : 1);
    const ix = Math.sin(yon) * itme, iz = Math.cos(yon) * itme;
    if (q.bot) { q.vx += ix; q.vz += iz; } else A.olaylar.push(['it', q.no, +ix.toFixed(2), +iz.toFixed(2)]);
    A.olaylar.push(['hit', q.no, dmg, bloklu ? 1 : 0, mana ? 1 : 0]);
    // Özel eşyalar
    if (s.ozel === 'don') q.yavasT = Math.max(q.yavasT || 0, 2);
    if (s.ozel === 'vampir' && a !== q && !a.olu) { const c = Math.max(1, Math.round(dmg * 0.2)); a.can = Math.min(a.st.canMax, a.can + c); A.olaylar.push(['iyi', a.no, c]); }
    if (bloklu && q.st.kalkan?.ozel === 'diken' && s.tur === 'yakin' && a !== q && !a.olu) {
      const r = Math.max(1, Math.round(ham * 0.4)); a.can -= r; a.sonVuran = q.no; a.sonVuranT = A.t;
      A.olaylar.push(['hit', a.no, r, 0, 0]); if (a.can <= 0) olum(a);
    }
    kacisKontrol(q);
    if (q.can <= 0) olum(q);
  }
  function olum(q) {
    if (q.olu) return;
    const A = M.arena;
    if (!q.dirildi && E.al(q.kusam.kafa)?.ozel === 'dirilis') { q.dirildi = true; q.can = 45; A.olaylar.push(['ozel', q.no, 'dirilis']); return; }   // 🔥 anka tüyü
    q.olu = true; q.can = 0; q.blk = false;
    let katil = -1;
    if (q.sonVuran >= 0 && A.t - q.sonVuranT < 10 && !dost(M.oyuncular[q.sonVuran], q)) { katil = q.sonVuran; const k = M.oyuncular[katil]; k.oldurme++; puanVer(k, 1); }
    A.olaylar.push(['ol', q.no, katil]);
    // Silahı ve kalkanı yere düşer: kalanlar alabilir
    const sx = Math.cos(q.yon) * 0.55, sz = -Math.sin(q.yon) * 0.55;
    q.kusam = { ...q.kusam };
    if (dusur(q, 'silah', q.x + sx, q.z + sz) | dusur(q, 'kalkan', q.x - sx, q.z - sz)) kusamDegisti(q);
  }

  // ---------- Yerdeki silah ve kalkanlar ----------
  const ALMA_MESAFE = 1.0, TAKAS_MESAFE = 1.6;
  function dusur(p, yuva, x, z) {
    const A = M.arena, id = p.kusam[yuva];
    if (!id) return false;
    delete p.kusam[yuva];
    const r = Math.hypot(x, z), sinir = A.R - 0.8;
    if (r > sinir) { x *= sinir / r; z *= sinir / r; }
    A.sutunlar.forEach(c => { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz) || 0.01; if (d < c.r + 0.4) { x = c.x + dx / d * (c.r + 0.4); z = c.z + dz / d * (c.r + 0.4); } });
    A.yerde.push({ id: ++A.yerNo, esya: id, x, z });
    A.yerDegisti = true;
    return true;
  }
  function kusamDegisti(p) {
    const eski = p.st.canMax;
    p.st = E.statlar(p.kusam);
    if (!p.olu) p.can = Math.max(1, Math.min(p.st.canMax, p.can + Math.max(0, p.st.canMax - eski)));
    M.arena.olaylar.push(['ks', p.no, p.kusam.silah || 0, p.kusam.kalkan || 0, p.st.canMax]);
  }
  // p yerdeki eşyayı alır; aynı yuvada eşyası varsa onu oraya bırakır (takas)
  function yerdenAl(p, it) {
    const A = M.arena, yuva = E.al(it.esya).yuva;
    A.yerde = A.yerde.filter(y => y !== it); A.yerDegisti = true;
    p.kusam = { ...p.kusam };
    const birakti = p.kusam[yuva] || 0;
    if (birakti) dusur(p, yuva, it.x, it.z);
    p.kusam[yuva] = it.esya;
    p.alT = 0.35;
    kusamDegisti(p);
    A.olaylar.push(['ya', p.no, it.esya, birakti]);
  }
  const enYakinYerde = (p, mesafe) => {
    let en = null, enD = mesafe;
    M.arena.yerde.forEach(y => { const d = Math.hypot(y.x - p.x, y.z - p.z); if (d < enD) { enD = d; en = y; } });
    return en;
  };
  // Bot için yerdeki eşya ne kadar iyi? (kendi eşyasından ne kadar iyi)
  const yerdeKazanc = (p, y) => { const x = E.al(y.esya), eski = E.al(p.kusam[x.yuva]); return x.p - (eski ? eski.p : 0); };

  function arenaAdim(dt) {
    const A = M.arena;
    if (M.faz === 'geri') { M.sayac -= dt; if (M.sayac <= 0) { M.faz = 'savas'; A.olaylar.push(['basla']); } snap(); return; }
    if (M.faz === 'turSonu') { M.sayac -= dt; if (M.sayac <= 0) turSonrasi(); return; }
    A.t += dt;
    A.zr = alanYaricap(A.t);
    if (A.t >= ALAN_BAS && A.t - dt < ALAN_BAS) A.olaylar.push(['alan']);
    const canli = M.oyuncular.filter(o => !o.olu);
    canli.forEach(p => {
      p.cd = Math.max(0, p.cd - dt);
      p.manaT = Math.max(0, p.manaT - dt); p.hizT = Math.max(0, p.hizT - dt); p.korumaT = Math.max(0, p.korumaT - dt); p.yavasT = Math.max(0, (p.yavasT || 0) - dt);
      // Alanın dışı can yakar
      if (Math.hypot(p.x, p.z) > A.zr + 0.2) {
        const yak = (A.t > ALAN_BAS + ALAN_SURE ? 16 : 9) * dt;
        p.can -= yak; p.alanYak = (p.alanYak || 0) + yak;
        if (p.alanYak >= 3) { A.olaylar.push(['alanHit', p.no, Math.round(p.alanYak)]); p.alanYak = 0; }
        if (p.can <= 0) olum(p);
      }
    });
    // Botlar
    M.oyuncular.forEach(p => { if (p.bot && !p.olu) botAdim(p, dt); });
    // Ekstra özellikler
    tuzakAdim(dt);
    if (M.ayar.oz.sandik) sandikAdim(dt);
    if (M.ayar.oz.seyirci) oyAdim(dt, canli.filter(o => !o.olu).length);
    meteorAdim(dt);
    // Yerdeki silah / kalkan: o yuvası boşsa üstünden geçince alır, botlar daha iyiyse takas eder
    if (A.yerde.length) M.oyuncular.forEach(p => {
      if (p.olu) return;
      p.alT = Math.max(0, (p.alT || 0) - dt);
      if (p.alT > 0) return;
      const y = A.yerde.find(y => Math.hypot(y.x - p.x, y.z - p.z) < ALMA_MESAFE && (!p.kusam[E.al(y.esya).yuva] || (p.bot && yerdeKazanc(p, y) > 0)));
      if (y) yerdenAl(p, y);
    });
    // Güçlendirmeler
    const gt = aktifGuclar();
    if (gt.length) {
      A.gucSayac -= dt;
      if (A.gucSayac <= 0 && A.guclar.length < 2 + Math.floor(M.oyuncular.length / 3)) {
        A.gucSayac = 6 + rnd() * 4;
        for (let k = 0; k < 10; k++) {
          const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * Math.max(1, A.zr - 1.5);
          const x = Math.sin(a) * r, z = Math.cos(a) * r;
          if (A.sutunlar.some(c => Math.hypot(c.x - x, c.z - z) < c.r + 0.8)) continue;
          A.guclar.push({ id: ++A.gucNo, x, z, tur: gt[Math.floor(rnd() * gt.length)] }); A.gucDegisti = true; break;
        }
      }
    }
    A.guclar = A.guclar.filter(g => {
      const p = M.oyuncular.find(o => !o.olu && Math.hypot(o.x - g.x, o.z - g.z) < 1.0);
      if (!p) return true;
      if (g.tur === 'can') p.can = Math.min(p.st.canMax, p.can + 60);
      else p[g.tur + 'T'] = GUC_SURE[g.tur];
      A.olaylar.push(['al', p.no, g.tur]); A.gucDegisti = true;
      return false;
    });
    // Mermiler
    A.mermiler = A.mermiler.filter(m => {
      m.omur -= dt;
      const adimSay = 3;
      for (let k = 0; k < adimSay; k++) {
        m.x += m.vx * dt / adimSay; m.z += m.vz * dt / adimSay;
        if (A.sutunlar.some(c => Math.hypot(c.x - m.x, c.z - m.z) < c.r)) { A.olaylar.push(['mp', m.x, m.z, m.tur]); if (m.s.ozel === 'patla') patla(m, null); return false; }
        const q = M.oyuncular.find(o => !o.olu && o.no !== m.sahip && !dost(M.oyuncular[m.sahip], o) && Math.hypot(o.x - m.x, o.z - m.z) < OYUNCU_R + 0.2);
        if (q) {
          const sahip = M.oyuncular[m.sahip];
          const yon = Math.atan2(m.vx, m.vz);
          if (q.blk && q.st.yansit && aci(q.yon, yon + Math.PI) < 1.3) {   // ayna kalkan mermiyi geri yollar
            m.vx = -m.vx; m.vz = -m.vz; m.sahip = q.no; m.omur = Math.max(m.omur, 0.8); A.olaylar.push(['yansi', q.no]);
            return true;
          }
          hasarVer(sahip, q, m.s, m.mana, yon);
          A.olaylar.push(['mp', m.x, m.z, m.tur]);
          if (m.s.ozel === 'patla') patla(m, q);
          return false;
        }
      }
      if (m.omur <= 0 && m.s.ozel === 'patla') patla(m, null);
      return m.omur > 0;
    });
    // Tur bitti mi?
    const kalan = M.oyuncular.filter(o => !o.olu);
    const bitmeli = takimli() ? new Set(kalan.map(o => o.takim)).size <= 1 : kalan.length <= 1;
    if (bitmeli && A.bitisSayac < 0) A.bitisSayac = 1.4;
    if (A.bitisSayac >= 0) { A.bitisSayac -= dt; if (A.bitisSayac < 0) turBitti(); }
    snap();
  }

  function botAdim(p, dt) {
    const A = M.arena, s = p.st.silah;
    p.hedefT -= dt; p.yanT -= dt; p.blkT -= dt;
    if (p.yanT <= 0) { p.yan *= -1; p.yanT = 1.5 + rnd() * 2; }
    const dusmanlar = M.oyuncular.filter(o => o !== p && !o.olu && !dost(p, o));
    if (p.hedefT <= 0 || !dusmanlar.includes(M.oyuncular[p.hedefNo])) {
      p.hedefT = 1 + rnd();
      let en = null, enD = 1e9;
      dusmanlar.forEach(o => { const d = Math.hypot(o.x - p.x, o.z - p.z) + (o.can / Math.max(1, o.st.canMax)) * 4; if (d < enD) { enD = d; en = o; } });
      p.hedefNo = en ? en.no : -1;
    }
    const q = M.oyuncular[p.hedefNo];
    let hx = 0, hz = 0, bakis = null;
    const merkezD = Math.hypot(p.x, p.z);
    if (merkezD > A.zr - 1.2) { hx = -p.x / (merkezD || 1); hz = -p.z / (merkezD || 1); }
    else {
      // Yakında güçlendirme varsa onu al
      let g = null, gD = 6;
      A.guclar.forEach(x => { const d = Math.hypot(x.x - p.x, x.z - p.z); if (d < gD && Math.hypot(x.x, x.z) < A.zr - 0.5) { gD = d; g = x; } });
      A.yerde.forEach(x => { const d = Math.hypot(x.x - p.x, x.z - p.z); if (d < gD && yerdeKazanc(p, x) > 0 && Math.hypot(x.x, x.z) < A.zr - 0.5) { gD = d; g = x; } });
      if (A.sandik) { const d = Math.hypot(A.sandik.x - p.x, A.sandik.z - p.z); if (d < 9) { gD = d; g = A.sandik; } }
      if (q) {
        const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
        bakis = Math.atan2(dx, dz);
        if (s.tur === 'atis') {
          const iste = Math.min(s.menzil * 0.6, 8);
          const ileri = d > iste + 1 ? 1 : d < iste - 2 ? -1 : 0;
          hx = dx / d * ileri + (-dz / d) * p.yan * 0.7; hz = dz / d * ileri + (dx / d) * p.yan * 0.7;
        } else {
          const ileri = d > s.menzil * 0.75 ? 1 : 0;
          hx = dx / d * ileri + (-dz / d) * p.yan * 0.25; hz = dz / d * ileri + (dx / d) * p.yan * 0.25;
        }
        if (g && gD < d * 0.8) { hx = (g.x - p.x) / gD; hz = (g.z - p.z) / gD; }
        // Saldır
        const menzil = s.tur === 'atis' ? s.menzil * 0.9 : s.menzil + OYUNCU_R - 0.1;
        if (d < menzil && p.cd <= 0 && p.blkT <= 0 && (s.tur === 'yakin' || !sutunArasi(p.x, p.z, q.x, q.z))) {
          p.tepkiT = (p.tepkiT ?? p.tepki) - dt;
          if (p.tepkiT <= 0) { p.tepkiT = p.tepki; saldiri(p, bakis + (rnd() - 0.5) * (s.tur === 'atis' ? 0.14 : 0.2)); }
        }
        // Kalkan kaldır: rakip yakında ve saldırıyorsa
        const qs = q.st.silah, qMenzil = qs.tur === 'atis' ? qs.menzil : qs.menzil + 1;
        if (p.blkT <= 0 && d < qMenzil && A.t - q.sonSaldiri < 0.15 && p.cd > 0.15 && rnd() < (p.st.kalkan ? 0.5 : 0.2)) p.blkT = 0.5 + rnd() * 0.4;
      } else if (g) { hx = (g.x - p.x) / gD; hz = (g.z - p.z) / gD; }
    }
    p.blk = p.blkT > 0;
    // Sütunlardan kaçın
    A.sutunlar.forEach(c => {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d < c.r + 1.6) { const k = (c.r + 1.6 - d) / 1.6; hx += dx / d * k * 1.5 + (-dz / d) * p.yan * k; hz += dz / d * k * 1.5 + (dx / d) * p.yan * k; }
    });
    const L = Math.hypot(hx, hz);
    const hiz = HIZ_TEMEL * (1 + p.st.hiz) * (p.blk ? 0.5 : 1) * (p.hizT > 0 ? 1.5 : 1) * (p.yavasT > 0 ? 0.5 : 1);
    let ix = L > 0.05 ? hx / L * hiz : 0, iz = L > 0.05 ? hz / L * hiz : 0;
    if (A.tuzak?.tur === 'buz') { const k = Math.min(1, dt * 1.8); p.mvx += (ix - p.mvx) * k; p.mvz += (iz - p.mvz) * k; ix = p.mvx; iz = p.mvz; }   // buzda kayar
    p.x += ix * dt; p.z += iz * dt;
    p.x += p.vx * dt; p.z += p.vz * dt;
    const sur = Math.exp(-6 * dt); p.vx *= sur; p.vz *= sur;
    carpisma(p);
    if (bakis !== null) p.yon = bakis; else if (L > 0.05) p.yon = Math.atan2(hx, hz);
  }
  function carpisma(p) {
    const A = M.arena;
    A.sutunlar.forEach(c => { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz) || 0.01; if (d < c.r + OYUNCU_R) { p.x = c.x + dx / d * (c.r + OYUNCU_R); p.z = c.z + dz / d * (c.r + OYUNCU_R); } });
    M.oyuncular.forEach(o => {
      if (o === p || o.olu) return;
      const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz) || 0.01;
      if (d < OYUNCU_R * 2) { p.x = o.x + dx / d * OYUNCU_R * 2; p.z = o.z + dz / d * OYUNCU_R * 2; }
    });
    const r = Math.hypot(p.x, p.z), sinir = A.R - OYUNCU_R;
    if (r > sinir) { p.x *= sinir / r; p.z *= sinir / r; }
  }

  function snap() {
    const A = M.arena;
    M.tick % 1 === 0 && yolla({
      tip: 'd', f: M.faz, s: +(M.faz === 'geri' ? M.sayac : A.t).toFixed(2), zr: +A.zr.toFixed(2),
      p: M.oyuncular.map(o => [o.no, +o.x.toFixed(2), +o.z.toFixed(2), +o.yon.toFixed(2), Math.ceil(o.can), (o.blk ? 1 : 0) | (o.manaT > 0 ? 2 : 0) | (o.hizT > 0 ? 4 : 0) | (o.korumaT > 0 ? 8 : 0) | (o.olu ? 16 : 0) | (o.yavasT > 0 ? 32 : 0)]),
      m: A.mermiler.map(m => [m.id, +m.x.toFixed(2), +m.z.toFixed(2), m.tur, +Math.atan2(m.vx, m.vz).toFixed(2)]),
      g: A.gucDegisti ? A.guclar.map(g => [g.id, +g.x.toFixed(2), +g.z.toFixed(2), g.tur]) : undefined,
      y: A.yerDegisti ? A.yerde.map(y => [y.id, +y.x.toFixed(2), +y.z.toFixed(2), y.esya]) : undefined,
      sd: A.sandikDegisti ? (A.sandik ? [A.sandik.id, +A.sandik.x.toFixed(2), +A.sandik.z.toFixed(2)] : 0) : undefined,
      mt: A.meteorDegisti ? A.meteorlar.map(m => [m.id, +m.x.toFixed(2), +m.z.toFixed(2), +m.t.toFixed(2)]) : undefined,
      o: A.olaylar.length ? A.olaylar : undefined,
    });
    A.gucDegisti = false; A.yerDegisti = false; A.sandikDegisti = false; A.meteorDegisti = false; A.olaylar = [];
  }

  function turBitti() {
    const A = M.arena;
    const kalan = M.oyuncular.filter(o => !o.olu);
    let sag = null, takimSag = -1;
    if (takimli()) { const t = new Set(kalan.map(o => o.takim)); if (t.size === 1) { takimSag = kalan[0].takim; puanVer(kalan[0], 2); } }
    else { sag = kalan.length === 1 ? kalan[0] : null; if (sag) sag.puan += 2; }
    A.olaylar.push(['bitti']); snap();
    const hedef = M.ayar.hedef, enYuksek = Math.max(...M.oyuncular.map(o => o.puan));
    const liderler = M.oyuncular.filter(o => o.puan === enYuksek);
    const bitti = enYuksek >= hedef && (takimli() ? new Set(liderler.map(o => o.takim)).size === 1 : liderler.length === 1);
    M.faz = 'turSonu'; M.sayac = bitti ? 6 : 8; M.oyunBitti = bitti;
    yolla({ tip: 'turSonu', sag: sag ? sag.no : -1, oldurme: M.oyuncular.map(o => o.oldurme), puanlar: M.oyuncular.map(o => o.puan), hedef, bitti, sure: M.sayac, kazanan: bitti ? liderler[0].no : -1, takim: takimli(), takimSag });
  }
  function turSonrasi() {
    if (M.oyunBitti) {
      const sira = M.oyuncular.slice().sort((a, b) => b.puan - a.puan).map(o => ({ no: o.no, puan: o.puan }));
      M.faz = 'bitti';
      yolla({ tip: 'bitti', sira, takim: takimli(), kazananTakim: takimli() ? M.oyuncular[sira[0].no].takim : -1 });
      return;
    }
    draftBaslat();
  }

  function adim(dt) {
    if (!M || M.faz === 'bitti') return;
    M.t += dt; M.tick++;
    if (M.arena && ['geri', 'savas', 'turSonu'].includes(M.faz)) arenaAdim(dt);
    else draftAdim(dt);
  }

  // Oyunculardan gelen mesajlar
  function girdi(id, m) {
    if (!M || !m || typeof m !== 'object') return;
    const p = M.oyuncular.find(o => o.id === id && !o.bot);
    if (!p) return;
    const sayi = v => (Number.isFinite(+v) ? +v : 0);
    if (m.tip === 'im') { p.imlec = { x: Math.max(-8, Math.min(8, sayi(m.x))), z: Math.max(-4, Math.min(4, sayi(m.z))) }; p.imlecT = M.t; return; }
    if (m.tip === 'zarAt') { zarAt(p.no); return; }
    if (m.tip === 'karar') { if (!M.arena) karar(p, String(m.id), !!m.giy); return; }
    if (m.tip === 'sec') { sec(p.no, sayi(m.i) | 0, false); return; }
    if (m.tip === 'joker') {
      const d = M.d;
      if (d && !M.arena && M.faz === 'secim' && d.sira[d.siraIdx] === p.no && p.joker > 0 && d.ekstra == null && kalanlar().length >= 2) { p.joker--; d.ekstra = p.no; draftYolla(); }
      return;
    }
    if (m.tip === 'oy') { if (M.arena) oyVer(p, sayi(m.i) | 0); return; }
    if (!M.arena || p.olu) return;
    if (m.tip === 'k') {
      if (M.faz === 'savas') {
        let x = sayi(m.x), z = sayi(m.z);
        const r = Math.hypot(x, z), sinir = M.arena.R - OYUNCU_R;
        if (r > sinir) { x *= sinir / r; z *= sinir / r; }
        p.x = x; p.z = z;
      }
      p.yon = sayi(m.y); p.blk = !!m.b && M.faz === 'savas';
      return;
    }
    if (m.tip === 'vur') { saldiri(p, sayi(m.y)); return; }
    if (m.tip === 'al') { if (M.faz === 'savas' && !(p.alT > 0)) { const y = enYakinYerde(p, TAKAS_MESAFE); if (y) yerdenAl(p, y); } return; }
  }
  // Oyuncu ayrıldı: yerine bot oynar
  function cikis(id) {
    if (!M) return;
    const p = M.oyuncular.find(o => o.id === id && !o.bot);
    if (!p) return;
    p.bot = true; p.cikti = false; p.ad = p.ad + ' 🤖';
    (p.kararlar || []).slice().forEach(id => { const x = E.al(id), eski = E.al(p.kusam[x.yuva]); karar(p, id, !eski || x.p > eski.p); });
    yolla({ tip: 'cikti', no: p.no, ad: p.ad });
    if (M.faz === 'secim' && M.d.sira[M.d.siraIdx] === p.no) siradakiBasla();
    if (M.faz === 'zar' && M.d.bekleyen.includes(p.no)) p.botZar = 0.5;
  }

  return {
    baslat, durdur, adim, girdi, cikis, esyaYeri, kapaliGuncelle, arenaR, siralama: n => siralama(n), statlar: E.statlar,
    SECIM_SURE, ZAR_SURE, ZAR_GOSTER, KARAR_SURE, ALAN_BAS, ALAN_SURE, HIZ_TEMEL, OYUNCU_R, GUC_SURE,
    get M() { return M; }, rastgeleKoy(f) { rnd = f; }, TAKAS_MESAFE: 1.6, ALMA_MESAFE: 1.0,
    OZ_ADLAR, atesDurum, ATES_R, ATES_DONGU, ATES_UYARI, ATES_YANAR,
  };
})();

if (typeof module !== 'undefined') module.exports = Motor;
