// =============================================================
// Zarena Savaşları - EŞYA LİSTESİ ve eşyaların güce çevrilmesi
// Her eşya bir yuvaya takılır. Aynı yuvaya yeni eşya gelince eskisi gider.
//   p     : eşyanın iyiliği (1 = çok kötü, 10 = efsane). Süre bitince en düşük p'li verilir.
//   can   : eklediği can     zirh: aldığı hasarı azaltır (0.1 = %10)    hiz: yürüme hızı (+0.1 = %10 hızlı)
//   silah : hasar, menzil (metre), bekleme (saniye), itme, tur ('yakin' | 'atis'), mermi, mhiz
//   kalkan: blok (kalkanı kaldırınca hasarın ne kadarını keser)
// Görünüş: sekil (modelin şekli), renk
// Bu dosya Node'da da çalışır (testler için).
// =============================================================

const Esya = (() => {
  const YUVALAR = ['kafa', 'govde', 'bacak', 'ayak', 'silah', 'kalkan'];
  const YUVA_AD = { kafa: 'Kafa', govde: 'Gövde', bacak: 'Bacak', ayak: 'Ayak', silah: 'Silah', kalkan: 'Kalkan' };
  const YUVA_EMOJI = { kafa: '⛑️', govde: '👕', bacak: '👖', ayak: '👟', silah: '⚔️', kalkan: '🛡️' };

  const L = [];
  const e = (yuva, id, ad, emoji, p, ozellik, sekil, renk) => L.push({ id: yuva + '.' + id, yuva, ad, emoji, p, ...ozellik, sekil, renk });

  // ---------- KAFA ----------
  e('kafa', 'kagit', 'Kâğıt şapka', '🎉', 1, { can: 0 }, 'koni', 0xff5ab0);
  e('kafa', 'asci', 'Aşçı şapkası', '👨‍🍳', 1, { can: 3 }, 'asci', 0xffffff);
  e('kafa', 'tavuk', 'Tavuk maskesi', '🐔', 2, { can: 2, hiz: 0.05 }, 'tavuk', 0xffffff);
  e('kafa', 'kova', 'Kova', '🪣', 2, { can: 5, zirh: 0.04 }, 'kova', 0x9aa4ae);
  e('kafa', 'bere', 'Yün bere', '🧶', 2, { can: 7, zirh: 0.02 }, 'bere', 0xd84a3a);
  e('kafa', 'tencere', 'Tencere', '🍲', 3, { can: 8, zirh: 0.06 }, 'kova', 0x5a5f66);
  e('kafa', 'kovboy', 'Kovboy şapkası', '🤠', 4, { can: 10, zirh: 0.03, hiz: 0.03 }, 'kovboy', 0x8a5a2a);
  e('kafa', 'deri', 'Deri başlık', '🪖', 4, { can: 12, zirh: 0.06 }, 'kask', 0x7a4a24);
  e('kafa', 'ninja', 'Ninja bandı', '🥷', 5, { can: 4, hiz: 0.08 }, 'bant', 0x222222);
  e('kafa', 'viking', 'Boynuzlu miğfer', '🐂', 6, { can: 18, zirh: 0.1 }, 'viking', 0x9aa4ae);
  e('kafa', 'tac', 'Altın taç', '👑', 6, { can: 20, zirh: 0.08 }, 'tac', 0xffcc22);
  e('kafa', 'sovalye', 'Şövalye miğferi', '⛑️', 8, { can: 25, zirh: 0.14, hiz: -0.03 }, 'sovalye', 0xc8ced6);
  e('kafa', 'ejder', 'Ejder kafatası', '🐲', 9, { can: 28, zirh: 0.15 }, 'ejderkafa', 0x2e9a5a);

  // ---------- GÖVDE ----------
  e('govde', 'karton', 'Karton kutu', '📦', 2, { can: 12, zirh: 0.03 }, 'kutu', 0xc8945a);
  e('govde', 'atlet', 'Atlet', '🎽', 2, { can: 10 }, 'atlet', 0xf4f4f4);
  e('govde', 'tisort', 'Tişört', '👕', 3, { can: 16 }, 'tisort', 0x3a7ad8);
  e('govde', 'hawaii', 'Hawaii gömleği', '🌺', 3, { can: 13, hiz: 0.03 }, 'tisort', 0xff8a3a);
  e('govde', 'bornoz', 'Bornoz', '🛁', 3, { can: 22, hiz: -0.05 }, 'bornoz', 0xf0e6ff);
  e('govde', 'yagmurluk', 'Yağmurluk', '🧥', 3, { can: 18, zirh: 0.02 }, 'bornoz', 0xffd23a);
  e('govde', 'kazak', 'Yün kazak', '🧶', 4, { can: 26 }, 'kazak', 0x2a8a5a);
  e('govde', 'fici', 'Fıçı', '🛢️', 4, { can: 50, zirh: 0.12, hiz: -0.2 }, 'fici', 0x8a5a2a);
  e('govde', 'deri', 'Deri yelek', '🦺', 5, { can: 35, zirh: 0.05 }, 'yelek', 0x7a4a24);
  e('govde', 'smokin', 'Smokin', '🤵', 5, { can: 30, zirh: 0.02, hiz: 0.02 }, 'smokin', 0x1a1a22);
  e('govde', 'zincir', 'Zincir zırh', '⛓️', 7, { can: 55, zirh: 0.12, hiz: -0.04 }, 'zirh', 0x8a929c);
  e('govde', 'plaka', 'Plaka zırh', '🛡️', 9, { can: 75, zirh: 0.2, hiz: -0.1 }, 'plaka', 0xc8ced6);
  e('govde', 'ejder', 'Ejder pulu zırh', '🐉', 10, { can: 70, zirh: 0.18 }, 'plaka', 0x2e9a5a);

  // ---------- BACAK ----------
  e('bacak', 'tutu', 'Bale eteği', '🩰', 2, { can: 4, hiz: 0.08 }, 'tutu', 0xffaad8);
  e('bacak', 'pijama', 'Pijama altı', '🛌', 2, { can: 10 }, 'pantolon', 0x8ab4ff);
  e('bacak', 'sort', 'Şort', '🩳', 2, { can: 6, hiz: 0.03 }, 'sort', 0xe8a03a);
  e('bacak', 'etek', 'İskoç eteği', '🏴', 3, { can: 12, hiz: 0.04 }, 'etek', 0x2a6a3a);
  e('bacak', 'esofman', 'Eşofman', '🏃', 4, { can: 12, hiz: 0.06 }, 'pantolon', 0x3a3a8a);
  e('bacak', 'kot', 'Kot pantolon', '👖', 4, { can: 18 }, 'pantolon', 0x2a4a8a);
  e('bacak', 'deri', 'Deri pantolon', '🤘', 5, { can: 22, zirh: 0.03 }, 'pantolon', 0x3a2414);
  e('bacak', 'zincir', 'Zincir dizlik', '⛓️', 6, { can: 30, zirh: 0.06, hiz: -0.03 }, 'pantolon', 0x8a929c);
  e('bacak', 'plaka', 'Zırhlı pantolon', '🦿', 8, { can: 40, zirh: 0.1, hiz: -0.06 }, 'pantolon', 0xc8ced6);
  e('bacak', 'ninja', 'Ninja şalvarı', '🥷', 7, { can: 20, hiz: 0.1 }, 'pantolon', 0x222222);

  // ---------- AYAK ----------
  e('ayak', 'terlik', 'Terlik', '🩴', 1, { can: 2, hiz: -0.05 }, 'terlik', 0x3ab4e8);
  e('ayak', 'palet', 'Dalgıç paleti', '🤿', 1, { can: 4, hiz: -0.18 }, 'palet', 0xffd23a);
  e('ayak', 'topuk', 'Topuklu ayakkabı', '👠', 1, { can: 3, hiz: -0.03 }, 'topuk', 0xd8203a);
  e('ayak', 'tavsan', 'Tavşan terlik', '🐰', 2, { can: 6 }, 'tavsan', 0xffd8ec);
  e('ayak', 'lastik', 'Lastik çizme', '🌧️', 3, { can: 8, hiz: -0.02 }, 'cizme', 0xffd23a);
  e('ayak', 'demir', 'Demir çizme', '🥾', 5, { can: 18, zirh: 0.06, hiz: -0.08 }, 'cizme', 0x9aa4ae);
  e('ayak', 'kovboy', 'Mahmuzlu çizme', '🤠', 5, { can: 8, hiz: 0.08 }, 'cizme', 0x8a5a2a);
  e('ayak', 'spor', 'Spor ayakkabı', '👟', 6, { can: 5, hiz: 0.15 }, 'spor', 0xf4f4f4);
  e('ayak', 'bot', 'Asker botu', '🥾', 6, { can: 12, zirh: 0.03, hiz: 0.05 }, 'cizme', 0x3a4a2a);
  e('ayak', 'paten', 'Paten', '🛼', 7, { can: 0, hiz: 0.3 }, 'paten', 0xff5ab0);
  e('ayak', 'kanatli', 'Kanatlı sandalet', '🪽', 9, { can: 8, hiz: 0.25 }, 'kanatli', 0xffcc22);

  // ---------- SİLAH ----------  (yumruk: hasar 6, menzil 1.3, bekleme 0.45)
  e('silah', 'tuy', 'Toz alıcı tüy', '🪶', 1, { hasar: 3, menzil: 1.7, bekleme: 0.3, itme: 1, tur: 'yakin' }, 'tuy', 0xff8ad8);
  e('silah', 'balik', 'Ölü balık', '🐟', 2, { hasar: 8, menzil: 1.5, bekleme: 0.45, itme: 3, tur: 'yakin' }, 'balik', 0x8ab4c8);
  e('silah', 'supurge', 'Süpürge', '🧹', 2, { hasar: 7, menzil: 2.1, bekleme: 0.6, itme: 7, tur: 'yakin' }, 'supurge', 0xc8a050);
  e('silah', 'semsiye', 'Şemsiye', '☂️', 2, { hasar: 8, menzil: 1.9, bekleme: 0.5, itme: 3, tur: 'yakin' }, 'semsiye', 0xd8203a);
  e('silah', 'baget', 'Bayat baget', '🥖', 2, { hasar: 9, menzil: 1.7, bekleme: 0.5, itme: 2, tur: 'yakin' }, 'baget', 0xd8a050);
  e('silah', 'oklava', 'Oklava', '🥢', 3, { hasar: 10, menzil: 1.6, bekleme: 0.5, itme: 3, tur: 'yakin' }, 'sopa', 0xe8c890);
  e('silah', 'domates', 'Domates torbası', '🍅', 3, { hasar: 5, menzil: 10, bekleme: 0.45, itme: 1, tur: 'atis', mermi: 'domates', mhiz: 13 }, 'torba', 0xd8302a);
  e('silah', 'tava', 'Tava', '🍳', 4, { hasar: 13, menzil: 1.5, bekleme: 0.6, itme: 6, tur: 'yakin' }, 'tava', 0x2a2a2a);
  e('silah', 'sapan', 'Sapan', '🪃', 4, { hasar: 9, menzil: 12, bekleme: 0.7, itme: 2, tur: 'atis', mermi: 'tas', mhiz: 16 }, 'sapan', 0x8a5a2a);
  e('silah', 'sopa', 'Beyzbol sopası', '🏏', 5, { hasar: 16, menzil: 1.8, bekleme: 0.7, itme: 8, tur: 'yakin' }, 'sopa', 0xc8945a);
  e('silah', 'hancer', 'Hançer', '🗡️', 6, { hasar: 12, menzil: 1.4, bekleme: 0.3, itme: 1, tur: 'yakin' }, 'hancer', 0xd8dee6);
  e('silah', 'mizrak', 'Mızrak', '🔱', 7, { hasar: 17, menzil: 2.8, bekleme: 0.7, itme: 4, tur: 'yakin' }, 'mizrak', 0x8a5a2a);
  e('silah', 'yay', 'Yay ve ok', '🏹', 7, { hasar: 16, menzil: 16, bekleme: 0.9, itme: 3, tur: 'atis', mermi: 'ok', mhiz: 22 }, 'yay', 0x8a5a2a);
  e('silah', 'cekic', 'Dev çekiç', '🔨', 7, { hasar: 34, menzil: 2.0, bekleme: 1.2, itme: 13, tur: 'yakin' }, 'cekic', 0x6a6f78);
  e('silah', 'kilic', 'Kılıç', '⚔️', 8, { hasar: 20, menzil: 2.0, bekleme: 0.55, itme: 4, tur: 'yakin' }, 'kilic', 0xd8dee6);
  e('silah', 'balta', 'Savaş baltası', '🪓', 8, { hasar: 28, menzil: 1.9, bekleme: 0.9, itme: 7, tur: 'yakin' }, 'balta', 0xa8aeb6);
  e('silah', 'arbalet', 'Arbalet', '🎯', 8, { hasar: 26, menzil: 18, bekleme: 1.4, itme: 5, tur: 'atis', mermi: 'ok', mhiz: 28 }, 'arbalet', 0x5a3a1a);
  e('silah', 'asa', 'Ateş asası', '🔥', 9, { hasar: 22, menzil: 14, bekleme: 1.1, itme: 5, tur: 'atis', mermi: 'ates', mhiz: 14 }, 'asa', 0xff6a1a);

  // ---------- KALKAN ----------  (kalkansız: kollarla %20 blok)
  e('kalkan', 'pizza', 'Pizza kutusu', '🍕', 1, { blok: 0.25 }, 'kutuK', 0xe8c890);
  e('kalkan', 'tepsi', 'Çay tepsisi', '🫖', 2, { blok: 0.35 }, 'yuvarlak', 0xc8ced6);
  e('kalkan', 'kitap', 'Kalın kitap', '📕', 2, { blok: 0.32, can: 5 }, 'kitap', 0xb02a2a);
  e('kalkan', 'kapak', 'Tencere kapağı', '🍲', 3, { blok: 0.42 }, 'yuvarlak', 0x6a6f78);
  e('kalkan', 'cop', 'Çöp kutusu kapağı', '🗑️', 3, { blok: 0.48 }, 'yuvarlak', 0x7a8a6a);
  e('kalkan', 'tahta', 'Tahta kalkan', '🪵', 5, { blok: 0.58, can: 5 }, 'yuvarlak', 0x8a5a2a);
  e('kalkan', 'kapi', 'Kapı', '🚪', 7, { blok: 0.9, can: 15, hiz: -0.1 }, 'kapi', 0x7a4a24);
  e('kalkan', 'demir', 'Demir kalkan', '🛡️', 8, { blok: 0.75, can: 10, hiz: -0.03 }, 'kule', 0xa8aeb6);
  e('kalkan', 'ayna', 'Ayna kalkan', '🪞', 9, { blok: 0.65, yansit: true }, 'yuvarlak', 0xe0f4ff);

  const HARITA = Object.fromEntries(L.map(x => [x.id, x]));
  const YUMRUK = { id: 'yumruk', ad: 'Yumruk', emoji: '👊', hasar: 6, menzil: 1.3, bekleme: 0.45, itme: 2, tur: 'yakin', sekil: 'yok' };
  const CAN_TEMEL = 50;      // sadece donla savaşanın canı

  // Kuşamdan savaş değerleri: kusam = { kafa: 'kafa.kova', silah: 'silah.kilic', ... }
  function statlar(kusam) {
    let can = CAN_TEMEL, zirh = 0, hiz = 0;
    YUVALAR.forEach(y => { const x = HARITA[kusam?.[y]]; if (!x) return; can += x.can || 0; zirh += x.zirh || 0; hiz += x.hiz || 0; });
    const silah = HARITA[kusam?.silah] || YUMRUK;
    const kalkan = HARITA[kusam?.kalkan] || null;
    return { canMax: Math.round(can), zirh: Math.min(0.5, zirh), hiz: Math.max(-0.35, Math.min(0.5, hiz)), silah, kalkan, blok: kalkan ? kalkan.blok : 0.2, yansit: !!kalkan?.yansit };
  }

  // Bir eşya seçme turunda kaç tur oynanır
  const turSayisi = (n, istek) => (istek >= 1 && istek <= 7 ? Math.round(istek) : (n >= 8 ? 4 : 5));

  // Eşya havuzunu karıştırıp tur başına n eşya ayırır (aynı seçimde aynı eşya iki kez çıkmaz)
  function draftHazirla(n, rastgele = Math.random, istek) {
    const T = turSayisi(n, istek);
    const havuz = L.map(x => x.id);
    for (let i = havuz.length - 1; i > 0; i--) { const j = Math.floor(rastgele() * (i + 1)); [havuz[i], havuz[j]] = [havuz[j], havuz[i]]; }
    // Her turda iyi ve kötü karışık olsun: havuzu sırayla dağıt
    const turlar = [];
    let k = 0;
    for (let t = 0; t < T; t++) { const tur = []; for (let i = 0; i < n; i++) tur.push(havuz[k++ % havuz.length]); turlar.push(tur); }
    return turlar;
  }
  // Kalan eşyalar arasında en kötüsü (süre bitince verilir)
  function enKotu(idler) {
    let en = null;
    idler.forEach(id => { if (!en || HARITA[id].p < HARITA[en].p) en = id; });
    return en;
  }
  // Bu eşya bu oyuncuya ne kadar yarar? (botlar için)
  function deger(id, kusam) {
    const x = HARITA[id], eski = HARITA[kusam?.[x.yuva]];
    return x.p - (eski ? eski.p * 0.9 : 0) + (x.yuva === 'silah' && !eski ? 2 : 0) + (x.yuva === 'govde' && !eski ? 1.5 : 0);
  }

  return { YUVALAR, YUVA_AD, YUVA_EMOJI, LISTE: L, HARITA, YUMRUK, CAN_TEMEL, statlar, turSayisi, draftHazirla, enKotu, deger, al: id => HARITA[id] };
})();

if (typeof module !== 'undefined') module.exports = Esya;
