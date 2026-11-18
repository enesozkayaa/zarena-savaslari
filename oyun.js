// =============================================================
// Zarena Savaşları - oyuncunun tarafı: ekranlar, bekleme odası, zar ve eşya seçimi,
// fare imleçleri, arenada yürüme / nişan / vuruş / kalkan, HUD.
// Oyunun kuralları evde (motor.js). Kendi yerini oyuncu hesaplar ve eve yollar.
// =============================================================

const Oyun = (() => {
  const SURUM = 1;   // sw.js ONBELLEK numarasıyla aynı tut; oyuncular farklı sürümdeyse uyarı çıkar
  const $ = id => document.getElementById(id);
  const E = Esya;
  Sahne.kur($('sahne'));
  const dokun = matchMedia('(pointer: coarse)').matches;
  if (dokun) document.body.classList.add('dokun');
  $('surumYazi').textContent = 'Sürüm ' + SURUM;

  const BOT_AD = ['Demir Bilek', 'Kel Hasan', 'Süpürgeci Sami', 'Tavacı Nuri', 'Dobra Dilek', 'Koca Yusuf', 'Fırtına Fatoş', 'Paspas Polat', 'Çılgın Cemile', 'Gürz Gürkan', 'Terlikli Tülay', 'Hızlı Hüsnü'];
  const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const NOKTA = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const zarYuz = v => Array.from({ length: 9 }, (_, i) => `<i${NOKTA[v].includes(i) ? ' class="n"' : ''}></i>`).join('');

  let mod = null, benimId = null;
  const gucVarsayilan = () => ({ mana: true, hiz: true, can: true, koruma: true });
  let lobi = { botlar: [], ayar: { hedef: 5, guc: gucVarsayilan() } };
  let oyun = null;

  // ---------- Giriş ----------
  try { $('adim').value = localStorage.getItem('zs.ad') || ''; } catch (e) { }
  function adAl() {
    const ad = $('adim').value.trim().slice(0, 14);
    if (!ad) { $('girisDurum').textContent = 'Önce adını yaz.'; $('adim').focus(); return null; }
    try { localStorage.setItem('zs.ad', ad); } catch (e) { }
    Ses.baslat();
    return ad;
  }
  $('tekBtn').onclick = () => {
    const ad = adAl(); if (!ad) return;
    mod = 'tek'; benimId = 'ben';
    lobi = { botlar: [], ayar: lobi.ayar };
    for (let i = 0; i < 3; i++) botEkle(true);
    ekranGoster('lobi'); lobiCiz();
  };
  $('odaKurBtn').onclick = () => { const ad = adAl(); if (!ad) return; mod = 'ev'; lobi.botlar = []; $('girisDurum').textContent = 'Oda açılıyor…'; Ag.odaAc(ad); };
  $('katilBtn').onclick = () => {
    const ad = adAl(); if (!ad) return;
    const kod = $('odaKoduGir').value.trim().toUpperCase();
    if (kod.length < 5) { $('girisDurum').textContent = 'Oda kodunu yaz (5 harf).'; return; }
    mod = 'misafir'; $('girisDurum').textContent = 'Bağlanılıyor…'; Ag.katil(kod, ad);
  };
  $('odaKoduGir').addEventListener('keydown', e => { if (e.key === 'Enter') $('katilBtn').click(); });
  function ekranGoster(ad) {
    ['giris', 'lobi', 'turSonu', 'sonuc'].forEach(e => $(e).classList.toggle('gizli', e !== ad));
    $('draft').classList.toggle('gizli', ad !== 'draft');
    $('hud').classList.toggle('gizli', ad !== 'hud');
  }

  // ---------- Ağ olayları ----------
  Ag.kabulKurali(n => {
    if (oyun && !oyun.bitti) return 'Oyun başladı; bitince tekrar dene.';
    if (n >= 10) return 'Oda dolu (en fazla 10 kişi).';
    if (n + lobi.botlar.length >= 10) { lobi.botlar.pop(); }
    return true;
  });
  Ag.on('oda', ({ kod }) => { benimId = Ag.benimId; $('lobiKod').textContent = kod; ekranGoster('lobi'); lobiYay(); lobiCiz(); });
  Ag.on('hata', m => { $('girisDurum').textContent = m; $('lobiDurum').textContent = m; });
  Ag.on('oyuncular', () => { if (mod === 'ev') lobiYay(); lobiCiz(); });
  Ag.on('mesaj', m => mesaj(m));
  Ag.on('evMesaj', (m, id) => { if (oyun && !oyun.bitti) Motor.girdi(id, m); });
  Ag.on('koptu', o => { if (mod === 'ev' && oyun && !oyun.bitti) Motor.cikis(o.id); });
  Ag.on('evKoptu', () => menuyeDon('Oda sahibiyle bağlantı koptu.'));
  function eve(m) {
    if (mod === 'tek') Motor.girdi(benimId, m);
    else Ag.eveGonder(m);
  }

  // ---------- Bekleme odası ----------
  const yonetici = () => mod === 'tek' || mod === 'ev';
  const insanlar = () => (mod === 'tek' ? [{ id: 'ben', ad: $('adim').value.trim() || 'Ben', ses: false }] : Ag.oyuncular);
  const herkes = () => [...insanlar().map(p => ({ ...p, bot: false })), ...lobi.botlar.map(b => ({ ...b, bot: true }))];
  function botEkle(sessiz) {
    if (herkes().length >= 10) return;
    const kullanilan = new Set(lobi.botlar.map(b => b.ad));
    const ad = BOT_AD.find(a => !kullanilan.has(a)) || 'Bot ' + (lobi.botlar.length + 1);
    lobi.botlar.push({ id: 'bot' + Date.now().toString(36) + Math.floor(Math.random() * 1000), ad });
    if (!sessiz) lobiYay();
  }
  $('botEkleBtn').onclick = () => { if (yonetici()) { botEkle(); lobiCiz(); } };
  $('botCikarBtn').onclick = () => { if (yonetici() && lobi.botlar.length) { lobi.botlar.pop(); lobiYay(); lobiCiz(); } };
  function lobiYay() { if (mod === 'ev') Ag.yayinla({ tip: 'lobi', botlar: lobi.botlar, ayar: lobi.ayar, surum: SURUM }); }
  function lobiCiz() {
    const L = herkes();
    $('lobiListe').innerHTML = L.map((p, i) => `<li style="--r:${hex(Insan.RENKLER[i])}"><span>${p.bot ? '🤖 ' : ''}${p.id === benimId ? '⭐ ' : ''}${kacis(p.ad)}${p.ses ? ' 🎤' : ''}</span><small>${Insan.RENK_AD[i]}</small></li>`).join('');
    $('ayHedef').value = String(lobi.ayar.hedef);
    $('ayHedef').disabled = !yonetici();
    document.querySelectorAll('#gucler input').forEach(c => { c.checked = !!lobi.ayar.guc[c.dataset.guc]; c.disabled = !yonetici(); });
    $('hepsiBtn').classList.toggle('gizli', !yonetici());
    $('botSatir').classList.toggle('gizli', !yonetici());
    $('botEkleBtn').disabled = L.length >= 10; $('botCikarBtn').disabled = !lobi.botlar.length;
    const acik = Object.values(lobi.ayar.guc).filter(Boolean).length;
    $('ayarOzet').textContent = `${L.length} oyuncu · ${lobi.ayar.hedef} puan · ${acik ? acik + ' güçlendirme' : 'güçlendirme yok'}`;
    $('baslaBtn').classList.toggle('gizli', !yonetici());
    $('lobiMikBtn').classList.toggle('gizli', mod === 'tek');
    document.querySelector('.kodKutu').classList.toggle('gizli', mod === 'tek');
    if (yonetici()) $('lobiDurum').textContent = L.length < 2 ? 'En az 2 oyuncu gerekli: bot ekle.' : mod === 'ev' ? 'Arkadaşların oda koduyla katılabilir. Boş yerlere bot ekleyebilirsin.' : '';
    else if (!/Sürümün/.test($('lobiDurum').textContent)) $('lobiDurum').textContent = 'Oda sahibi oyunu başlatacak…';
  }
  document.querySelectorAll('#gucler input').forEach(c => c.addEventListener('change', () => {
    if (!yonetici()) return;
    lobi.ayar.guc = { ...lobi.ayar.guc, [c.dataset.guc]: c.checked };
    lobiYay(); lobiCiz();
  }));
  $('hepsiBtn').onclick = () => { if (!yonetici()) return; lobi.ayar.guc = gucVarsayilan(); lobiYay(); lobiCiz(); };
  $('ayHedef').addEventListener('change', () => { if (!yonetici()) return; lobi.ayar.hedef = +$('ayHedef').value; lobiYay(); lobiCiz(); });
  $('kodKopyalaBtn').onclick = () => { navigator.clipboard?.writeText(Ag.kod).then(() => { $('lobiDurum').textContent = 'Kod kopyalandı.'; }).catch(() => {}); };
  $('lobiCikBtn').onclick = () => menuyeDon('');
  $('lobiMikBtn').onclick = mikDegistir;
  $('baslaBtn').onclick = baslat;
  function baslat() {
    if (!yonetici()) return;
    const L = herkes();
    if (L.length < 2) { $('lobiDurum').textContent = 'En az 2 oyuncu gerekli: bot ekle.'; return; }
    const liste = L.map((p, i) => ({ id: p.id, ad: p.ad, bot: p.bot, renk: i, ten: (i * 3 + 1) % 5 }));
    const geri = mod === 'tek' ? { herkese: m => mesaj(m) } : { herkese: m => Ag.yayinla(m) };
    Motor.baslat(liste, lobi.ayar, geri);
  }
  function menuyeDon(neden) {
    Motor.durdur();
    if (mod !== 'tek') Ag.kapat();
    oyunTemizle();
    mod = null;
    ekranGoster('giris');
    $('girisDurum').textContent = neden || '';
  }
  $('lobiyeBtn').onclick = () => {
    if (mod === 'ev') { Motor.durdur(); Ag.yayinla({ tip: 'lobiyeDon' }); }
    else if (mod === 'tek') { Motor.durdur(); oyunTemizle(); ekranGoster('lobi'); lobiCiz(); }
    else { oyunTemizle(); ekranGoster('lobi'); lobiCiz(); }
  };
  $('tekrarBtn').onclick = () => { if (yonetici()) baslat(); };
  $('cikBtn').onclick = () => { if (confirm('Oyundan çıkılsın mı?')) menuyeDon(''); };
  $('sesBtn').onclick = () => { const a = Ses.degistir(); $('sesBtn').textContent = a ? '🔊' : '🔇'; };
  $('sesBtn').textContent = Ses.acik ? '🔊' : '🔇';
  $('mikBtn').onclick = mikDegistir;
  async function mikDegistir() {
    if (mod === 'tek') return;
    if (Ag.sesAcik) Ag.sesKapat(); else if (!(await Ag.sesAc())) { akis('🎤 Mikrofona izin verilmedi.', 'kotu'); $('lobiDurum').textContent = 'Mikrofona izin verilmedi.'; }
    mikCiz();
  }
  function mikCiz() {
    const a = Ag.sesAcik;
    $('lobiMikBtn').textContent = a ? '🎤 Mikrofon açık' : '🎤 Mikrofon kapalı';
    $('mikBtn').classList.toggle('acik', a); $('mikBtn').classList.toggle('kapali', !a);
    $('mikBtn').classList.toggle('gizli', mod === 'tek');
  }

  // ---------- Oyun kurulumu ----------
  function oyunKur(m) {
    oyunTemizle();
    oyun = { oyuncular: m.oyuncular, ayar: m.ayar, ben: m.oyuncular.find(p => p.id === benimId), k: new Map(), puan: m.oyuncular.map(() => 0), bitti: false, faz: 'basla', d: null, imlec: new Map() };
    m.oyuncular.forEach(p => {
      const h = Insan.yap(p.renk, p.ten);
      const et = Sahne.etiketYap(p.ad, hex(Insan.RENKLER[p.renk]));
      h.add(et);
      Sahne.scene.add(h);
      oyun.k.set(p.no, { h, et, x: 0, z: 0, yon: 0, hx: 0, hz: 0, hyon: 0, can: 1, canMax: 1, bayrak: 0, kusam: {}, efekt: null });
    });
    $('akis').innerHTML = '';
    mikCiz(); Ag.sesGuncelle();
  }
  function oyunTemizle() {
    if (oyun) { oyun.k.forEach(v => Sahne.scene.remove(v.h)); Sahne.gucleriTemizle(); Sahne.mermileriCiz([]); clearInterval(oyun.turSayac); }
    oyun = null; ben = null;
    $('imlecler').innerHTML = '';
  }
  const benimNo = () => (oyun?.ben ? oyun.ben.no : -1);
  const oyuncu = no => oyun.oyuncular[no];
  const renkCss = no => hex(Insan.RENKLER[oyuncu(no).renk]);

  // ---------- Mesajlar ----------
  function mesaj(m) {
    switch (m.tip) {
      case 'lobi':
        lobi = { botlar: m.botlar || [], ayar: { ...m.ayar, guc: m.ayar.guc || gucVarsayilan() } };
        if (!Ag.evMi && m.surum !== SURUM) $('lobiDurum').innerHTML = `⚠️ <b>Sürümün farklı!</b> Oda sahibi: ${m.surum ?? 'eski'}, sen: ${SURUM}. Daha eski olan sayfayı yenilesin (gerekirse kapatıp aç).`;
        if (!oyun || oyun.bitti) lobiCiz();
        break;
      case 'lobiyeDon': oyunTemizle(); ekranGoster('lobi'); lobiCiz(); break;
      case 'basla': oyunKur(m); break;
      case 'draft': if (oyun) draftGeldi(m); break;
      case 'im': if (oyun) imlecGeldi(m.l); break;
      case 'arena': if (oyun) arenaKur(m); break;
      case 'd': if (oyun) snapGeldi(m); break;
      case 'turSonu': if (oyun) turSonu(m); break;
      case 'bitti': if (oyun) oyunBitti(m); break;
      case 'cikti': if (oyun) { oyun.oyuncular[m.no].ad = m.ad; akis(`🚪 ${kacis(m.ad.replace(' 🤖', ''))} oyundan çıktı, yerine bot oynuyor`); const v = oyun.k.get(m.no); v.et.userData.ad = m.ad; v.et.userData.can = -1; } break;
    }
  }

  // ================= EŞYA SEÇİMİ =================
  function draftGeldi(m) {
    const ilk = oyun.faz !== 'draft' || !oyun.d || oyun.d.tur !== m.tur || oyun.d.draftNo !== m.draftNo || (m.faz === 'zar' && oyun.d.faz !== 'zar');
    const onceki = oyun.d;
    oyun.d = m; oyun.d.alindi = performance.now();
    if (oyun.faz !== 'draft') {
      oyun.faz = 'draft';
      Sahne.gucleriTemizle(); Sahne.mermileriCiz([]);
      Sahne.arenaKur(10 + oyun.oyuncular.length, []);
      ekranGoster('draft');
      cizgiDiz();
    }
    if (!oyun.tahta) tahtaKur(m);
    if (m.faz === 'zar' && ilk) { oyun.zarBas = performance.now(); oyun.zarSes = -1; tahtaKur(m); }
    if (m.son && (!onceki || !onceki.son || onceki.son.i !== m.son.i || onceki.son.no !== m.son.no || onceki.tur !== m.tur)) {
      if (m.son.oto) { akis(`⏱️ ${kacis(oyuncu(m.son.no).ad)} geç kaldı, en kötüsü verildi`); if (m.son.no === benimNo()) Ses.kotuSec(); }
      else Ses.sec();
      oyun.yeniAlinan = m.son.i;
    }
    // sıra bende mi?
    const siradaki = m.faz === 'secim' ? m.sira[m.siraIdx] : -1;
    if (siradaki === benimNo() && oyun.sonSiraSes !== `${m.draftNo}.${m.tur}.${m.siraIdx}`) { oyun.sonSiraSes = `${m.draftNo}.${m.tur}.${m.siraIdx}`; Ses.sira(); }
    // karakterleri giydir
    m.kusam.forEach((k, no) => { const v = oyun.k.get(no); v.kusam = k; Insan.giydir(v.h, k); });
    tahtaCiz(); zarlariCiz(); kusamimCiz();
  }
  function cizgiDiz() {
    const n = oyun.oyuncular.length;
    const dik = innerWidth < innerHeight && n > 4, sut = dik ? Math.ceil(n / 2) : n;
    oyun.k.forEach((v, no) => {
      const sat = Math.floor(no / sut), c = no % sut, buSira = sat === 0 ? sut : n - sut;
      v.h.position.set((c - (buSira - 1) / 2) * 1.5 + sat * 0.75, 0, -sat * 1.9); v.h.rotation.y = 0; v.et.scale.set(1.5, 0.46, 1); v.et.position.y = 2.3; v.h.scale.setScalar(1);
      v.x = v.hx = v.h.position.x; v.z = v.hz = v.h.position.z; v.h.visible = true; v.bayrak = 0; v.et.visible = true;
      if (v.efekt) { v.efekt.balon.visible = false; v.efekt.halka.visible = false; }
      Sahne.etiketCiz(v.et, 1, 1, true);
    });
    Sahne.draftKamera(sut, dik ? 1.9 : 0); Sahne.kameraSifirla();
  }
  // Kartları yerleştir (her ekranda aynı düzen: imleçler doğru karta denk gelsin)
  function tahtaKur(m) {
    const n = m.esyalar.length;
    const sut = n <= 5 ? n : Math.ceil(n / 2), sat = Math.ceil(n / sut);
    oyun.tahta = { sut, sat, n };
    tahtaBoyut();
  }
  function tahtaBoyut() {
    if (!oyun?.tahta) return;
    const { sut, sat } = oyun.tahta, gap = 8;
    const W = Math.min(900, innerWidth - 20);
    const maxH = innerHeight * (innerHeight < 500 ? 0.5 : 0.44);
    let kw = (W - gap * (sut - 1)) / sut, kh = Math.min(kw * 1.05, 190, (maxH - gap * (sat - 1)) / sat);
    kw = Math.min(kw, kh * 1.25, 170);
    const w = kw * sut + gap * (sut - 1), h = kh * sat + gap * (sat - 1);
    const k = $('tahtaKutu'); k.style.width = w + 'px'; k.style.height = h + 'px';
    const t = $('tahta'); t.style.gridTemplateColumns = `repeat(${sut}, 1fr)`; t.style.gridTemplateRows = `repeat(${sat}, 1fr)`;
  }
  window.addEventListener('resize', () => { tahtaBoyut(); if (oyun && (oyun.faz === 'draft' || oyun.faz === 'bitti')) cizgiDiz(); });
  function ozellikYazi(x) {
    const p = [];
    if (x.yuva === 'silah') { p.push(`💥${x.hasar}`); p.push(x.tur === 'atis' ? `🎯 ${x.menzil}m` : `📏 ${x.menzil}m`); p.push(`⏱️${x.bekleme}s`); }
    if (x.yuva === 'kalkan') p.push(`🛡️ %${Math.round(x.blok * 100)}${x.yansit ? ' ↩️' : ''}`);
    if (x.can) p.push(`❤️+${x.can}`);
    if (x.zirh) p.push(`🪨%${Math.round(x.zirh * 100)}`);
    if (x.hiz) p.push(`${x.hiz > 0 ? '💨+' : '🐌'}${Math.round(Math.abs(x.hiz) * 100)}%`);
    return p.join(' ');
  }
  function tahtaCiz() {
    const d = oyun.d, kusam = d.kusam[benimNo()] || {};
    const benimSiram = d.faz === 'secim' && d.sira[d.siraIdx] === benimNo();
    $('tahta').innerHTML = d.esyalar.map((id, i) => {
      const x = E.al(id), kim = d.alinan[i];
      const eski = kusam[x.yuva] && kim === undefined ? E.al(kusam[x.yuva]) : null;
      const yildiz = '★'.repeat(Math.max(1, Math.round(x.p / 2))) + '☆'.repeat(5 - Math.max(1, Math.round(x.p / 2)));
      const kimAd = kim !== undefined ? kacis(oyuncu(kim).ad) : '';
      return `<div class="esyaKart p${x.p}${kim !== undefined ? ' alindi' : ''}${oyun.yeniAlinan === i ? ' yeniAlindi' : ''}" data-i="${i}" data-kim="${kimAd}" style="--r:${kim !== undefined ? renkCss(kim) : '#fff'}">
        <div class="yuva">${E.YUVA_EMOJI[x.yuva]} ${E.YUVA_AD[x.yuva]}</div><div class="emo">${x.emoji}</div><div class="ad">${kacis(x.ad)}</div>
        <div class="yildiz">${yildiz}</div><div class="ozl">${ozellikYazi(x)}</div>${eski && benimSiram ? `<div class="degis">yerine: ${eski.emoji} ${kacis(eski.ad)}</div>` : ''}</div>`;
    }).join('');
    oyun.yeniAlinan = -1;
    $('tahta').querySelectorAll('.esyaKart').forEach(k => k.addEventListener('click', () => kartTikla(+k.dataset.i)));
  }
  function kartTikla(i) {
    const d = oyun?.d; if (!d) return;
    if (d.faz !== 'secim' || d.sira[d.siraIdx] !== benimNo() || d.alinan[i] !== undefined) return;
    eve({ tip: 'sec', i });
  }
  function zarlariCiz() {
    const d = oyun.d; if (!d || !d.asamalar) return;
    const gecen = (performance.now() - (oyun.zarBas || 0)) / 1000;
    const zarBitti = d.faz !== 'zar';
    // hangi aşamaya kadar gösterilir
    const asamaGoster = zarBitti ? d.asamalar.length : Math.floor((gecen - 0.4) / Motor.ZAR_ASAMA) + 1;
    const yuvarlanan = zarBitti ? -1 : Math.floor((gecen - 0.4) / Motor.ZAR_ASAMA);
    const yuvarlaniyor = !zarBitti && gecen > 0.4 && ((gecen - 0.4) % Motor.ZAR_ASAMA) < 0.9 && yuvarlanan < d.asamalar.length;
    if (!zarBitti && yuvarlaniyor && oyun.zarSes !== yuvarlanan) { oyun.zarSes = yuvarlanan; Ses.zar(); setTimeout(() => Ses.zarDus(), 850); }
    const siraNo = Object.fromEntries(d.sira.map((no, k) => [no, k + 1]));
    const siradaki = d.faz === 'secim' ? d.sira[d.siraIdx] : -1;
    const sirali = zarBitti ? d.sira : oyun.oyuncular.map(p => p.no);
    $('zarlar').innerHTML = sirali.map(no => {
      const zarlar = [];
      d.asamalar.forEach((a, k) => {
        if (a[no] === undefined || k >= Math.max(0, asamaGoster)) return;
        const yuv = yuvarlaniyor && k === yuvarlanan;
        const esit = !yuv && Object.keys(a).some(o => +o !== no && a[o] === a[no]) && d.asamalar.slice(k + 1).some(b => b[no] !== undefined);
        zarlar.push({ v: yuv ? 1 + Math.floor(Math.random() * 6) : a[no], yuv, esit });
      });
      const html = zarlar.map((z, k) => `<div class="zar${z.yuv ? ' yuvarlan' : ''}${z.esit ? ' esit' : ''}${k < zarlar.length - 1 ? ' eski' : ''}">${zarYuz(z.v)}</div>`).join('');
      const secti = d.faz === 'secim' && d.sira.indexOf(no) < d.siraIdx || d.faz === 'bekle';
      return `<div class="zarKisi${no === siradaki ? ' siradaki' : ''}${secti ? ' secti' : ''}" style="--r:${renkCss(no)}"><span class="siraNo">${zarBitti ? siraNo[no] : '?'}</span><div class="zarlarim">${html || '<div class="zar eski bos">?</div>'}</div><span class="zarAd">${kacis(oyuncu(no).ad)}</span>${no === benimNo() ? ' ⭐' : ''}</div>`;
    }).join('');
    // durum yazısı
    let durum = '';
    if (d.faz === 'zar') durum = asamaGoster > 1 && yuvarlaniyor ? '🎲 Eşit atanlar kendi aralarında yeniden atıyor!' : '🎲 Zarlar atılıyor… En büyük atan ilk seçer';
    else if (d.faz === 'secim') durum = siradaki === benimNo() ? '👉 <b style="--r:#7aff5a">Sıra sende!</b> Bir eşyaya tıkla' : `Sıra <b style="--r:${renkCss(siradaki)}">${kacis(oyuncu(siradaki).ad)}</b> oyuncusunda`;
    else if (d.faz === 'bekle') durum = d.sonraki === 'arena' ? '⚔️ Herkes kuşandı! Arenaya çıkılıyor…' : 'Sonraki tur geliyor…';
    $('draftDurum').innerHTML = durum;
    $('draftBaslik').textContent = `🎲 Eşya seçimi · Tur ${Math.min(d.tur + 1, d.turSay)} / ${d.turSay}`;
  }
  function kusamimCiz() {
    const no = benimNo(); if (no < 0) { $('kusamim').innerHTML = ''; return; }
    const k = oyun.d.kusam[no] || {}, st = E.statlar(k);
    $('kusamim').innerHTML = E.YUVALAR.map(y => { const x = E.al(k[y]); return `<div class="yuvaKutu${x ? '' : ' bos'}"><b>${x ? x.emoji : E.YUVA_EMOJI[y]}</b>${x ? kacis(x.ad) : E.YUVA_AD[y] + ' boş'}</div>`; }).join('')
      + `<div class="statYazi">❤️ ${st.canMax} · 🪨 %${Math.round(st.zirh * 100)} · 💨 ${st.hiz >= 0 ? '+' : ''}${Math.round(st.hiz * 100)}% · ${st.silah.emoji} ${st.silah.hasar}</div>`;
  }
  function sureCiz() {
    const d = oyun?.d; if (!d) return;
    const kalan = Math.max(0, d.sure - (performance.now() - d.alindi) / 1000);
    const top = d.faz === 'secim' ? Motor.SECIM_SURE : 1;
    $('draftSureDolu').style.width = d.faz === 'secim' ? (kalan / top * 100) + '%' : '0%';
    if (d.faz === 'secim' && d.sira[d.siraIdx] === benimNo() && kalan < 3.5 && Math.ceil(kalan) !== oyun.sonTik) { oyun.sonTik = Math.ceil(kalan); Ses.tik(); }
  }
  // ---------- İmleçler ----------
  const IMLEC_SVG = r => `<svg viewBox="0 0 24 24"><path d="M3 2 L3 20 L8 15 L12 23 L15 21.5 L11 14 L18 14 Z" fill="${r}" stroke="#000" stroke-width="1.5"/></svg>`;
  let sonImlec = 0, imlecBekleyen = null;
  function imlecYolla(cx, cy) {
    if (!oyun || oyun.faz !== 'draft') return;
    const r = $('tahtaKutu').getBoundingClientRect();
    if (!r.width) return;
    const u = Math.max(-0.3, Math.min(1.3, (cx - r.left) / r.width)), v = Math.max(-0.6, Math.min(1.6, (cy - r.top) / r.height));
    imlecBekleyen = { u, v };
    const simdi = performance.now();
    if (simdi - sonImlec > 70) { sonImlec = simdi; eve({ tip: 'im', u: +u.toFixed(3), v: +v.toFixed(3) }); imlecBekleyen = null; }
  }
  setInterval(() => { if (imlecBekleyen && oyun) { eve({ tip: 'im', u: +imlecBekleyen.u.toFixed(3), v: +imlecBekleyen.v.toFixed(3) }); imlecBekleyen = null; sonImlec = performance.now(); } }, 90);
  window.addEventListener('mousemove', e => imlecYolla(e.clientX, e.clientY));
  window.addEventListener('touchstart', e => { const t = e.touches[0]; if (t) imlecYolla(t.clientX, t.clientY); }, { passive: true });
  window.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) imlecYolla(t.clientX, t.clientY); }, { passive: true });
  function imlecGeldi(l) {
    const kutu = $('imlecler');
    l.forEach(([no, u, v]) => {
      if (no === benimNo()) return;
      let el = oyun.imlec.get(no);
      if (!el) {
        el = document.createElement('div'); el.className = 'imlec'; el.style.setProperty('--r', renkCss(no));
        el.innerHTML = IMLEC_SVG(renkCss(no)) + `<span>${kacis(oyuncu(no).ad)}</span>`;
        kutu.appendChild(el); oyun.imlec.set(no, el);
      }
      el.style.left = (u * 100) + '%'; el.style.top = (v * 100) + '%';
      el.dataset.t = performance.now();
    });
  }

  // ================= ARENA =================
  let ben = null;
  const tuslar = new Set();
  let fareX = innerWidth / 2, fareY = innerHeight / 2, sol = false, sag = false;
  const joy = { aktif: false, id: null, x: 0, y: 0 }, dokunVur = { basili: false }, dokunKalkan = { basili: false };
  function arenaKur(m) {
    oyun.faz = 'arena'; oyun.arena = { R: m.R, zr: m.R, f: 'geri', s: 3, sutunlar: m.sutunlar, sonSayi: -1 };
    Sahne.arenaKur(m.R, m.sutunlar);
    oyun.imlec.forEach(el => el.remove()); oyun.imlec.clear();
    oyun.d = null; oyun.tahta = null;
    m.oyuncular.forEach(p => {
      const v = oyun.k.get(p.no);
      Object.assign(v, { x: p.x, z: p.z, hx: p.x, hz: p.z, yon: p.yon, hyon: p.yon, can: p.can, canMax: p.canMax, bayrak: 0, kusam: p.kusam, olu: false, st: E.statlar(p.kusam) });
      Insan.giydir(v.h, p.kusam);
      v.h.position.set(p.x, 0, p.z); v.h.rotation.y = p.yon; v.h.scale.setScalar(1.2);
      Sahne.etiketCiz(v.et, p.can, p.canMax, false); v.et.scale.set(1.8, 0.56, 1); v.et.position.y = 2.35;
    });
    const bn = benimNo();
    if (bn >= 0) { const p = m.oyuncular[bn]; ben = { x: p.x, z: p.z, yon: p.yon, vx: 0, vz: 0, st: E.statlar(p.kusam), cd: 0, olu: false, sonYolla: 0 }; }
    else ben = null;
    Sahne.arenaKamera(ben ? ben.x : 0, ben ? ben.z : 0, m.R); Sahne.kameraSifirla();
    ekranGoster('hud'); mikCiz();
    $('izleYazi').classList.add('gizli'); document.body.classList.remove('izliyor');
    $('akis').innerHTML = '';
    puanTabloCiz();
    buyukYazi('HAZIR OL!', ben ? `${ben.st.silah.emoji} ${ben.st.silah.ad} · ❤️ ${ben.st.canMax}` : '', 1200);
    Sahne.cosku(1.5);
  }
  function snapGeldi(m) {
    const A = oyun.arena; if (!A) return;
    A.f = m.f; A.s = m.s; A.zr = m.zr;
    if (m.f === 'geri') { const n = Math.ceil(m.s); if (n !== A.sonSayi && n > 0 && n <= 3) { A.sonSayi = n; buyukYazi(String(n), '', 800); Ses.tik(); } }
    m.p.forEach(([no, x, z, yon, can, b]) => {
      const v = oyun.k.get(no); if (!v) return;
      v.hx = x; v.hz = z; v.hyon = yon; v.can = can; v.bayrak = b;
      if (b & 16 && !v.olu) { v.olu = true; }
    });
    Sahne.mermileriCiz(m.m);
    if (m.g) Sahne.gucleriCiz(m.g);
    Sahne.alanGuncelle(m.zr);
    if (m.o) m.o.forEach(olay);
  }
  function olay(o) {
    const bn = benimNo();
    switch (o[0]) {
      case 'basla': buyukYazi('SAVAŞ!', 'Son kalan +2, her yere seriş +1', 1300); Ses.gong(); Sahne.cosku(2); break;
      case 'sv': {
        const v = oyun.k.get(o[1]); if (!v) break;
        if (o[1] !== bn) Insan.saldir(v.h);
        const s = v.st?.silah;
        if (s?.tur === 'atis') Ses.atis(s.mermi); else Ses.savur(s && s.hasar > 20);
        break;
      }
      case 'hit': {
        const [, no, dmg, blk, mana] = o, v = oyun.k.get(no); if (!v) break;
        const x = v.h.position.x, z = v.h.position.z;
        Sahne.sayiGoster(x, 2.1, z, '-' + dmg, blk ? '#bcd' : mana ? '#d58aff' : no === bn ? '#ff5a4a' : '#fff', mana ? 1.3 : 1);
        Sahne.partikul(x, 1.2, z, blk ? 0xdddddd : 0xd8202a, blk ? 8 : 10, 3);
        if (blk) Ses.blok(); else Ses.vur(Math.min(1.4, 0.5 + dmg / 20));
        if (no === bn) Sahne.sars(blk ? 0.15 : 0.35);
        break;
      }
      case 'it': if (o[1] === bn && ben) { ben.vx += o[2]; ben.vz += o[3]; } break;
      case 'ol': {
        const [, no, katil] = o, v = oyun.k.get(no); if (!v) break;
        v.olu = true;
        Sahne.partikul(v.h.position.x, 1, v.h.position.z, 0xffd36a, 24, 5, 0.9);
        Ses.olum(); Sahne.cosku(2.5);
        if (katil >= 0) { oyun.puan[katil]++; akis(`⚔️ <b style="color:${renkCss(katil)}">${kacis(oyuncu(katil).ad)}</b> → <b style="color:${renkCss(no)}">${kacis(oyuncu(no).ad)}</b> yere serildi! (+1)`, katil === bn ? 'iyi' : no === bn ? 'kotu' : ''); }
        else akis(`💀 <b style="color:${renkCss(no)}">${kacis(oyuncu(no).ad)}</b> alanın dışında yandı`, no === bn ? 'kotu' : '');
        if (no === bn) { if (ben) ben.olu = true; buyukYazi('YERE SERİLDİN!', katil >= 0 ? `${oyuncu(katil).ad} seni devirdi` : 'Alanın dışında kaldın', 2000); $('izleYazi').classList.remove('gizli'); document.body.classList.add('izliyor'); }
        if (katil === bn && katil >= 0) buyukYazi('+1 PUAN!', `${oyuncu(no).ad} yere serildi`, 1200);
        puanTabloCiz();
        break;
      }
      case 'al': {
        const [, no, tur] = o, v = oyun.k.get(no);
        const AD = { mana: '🔮 Mana', hiz: '🧪 Hız iksiri', can: '❤️ Can iksiri', koruma: '🫧 Koruma balonu' };
        if (v) Sahne.partikul(v.h.position.x, 1, v.h.position.z, Sahne.GUC_RENK[tur], 16, 3);
        if (no === bn) { Ses.guc(tur); buyukYazi(AD[tur] + '!', { mana: '8 saniye güçlü vuruş', hiz: '6 saniye hızlı koşu', can: '+40 can', koruma: '6 saniye yarım hasar' }[tur], 1100); }
        else akis(`${AD[tur]}: ${kacis(oyuncu(no).ad)} aldı`);
        if (tur === 'can' && v) Sahne.sayiGoster(v.h.position.x, 2.1, v.h.position.z, '+40', '#7aee5a');
        break;
      }
      case 'alan': buyukYazi('ALAN DARALIYOR!', 'Kırmızının dışında kalma, ortaya gel!', 1800); Ses.alan(); break;
      case 'alanHit': { const v = oyun.k.get(o[1]); if (v) Sahne.sayiGoster(v.h.position.x, 2.1, v.h.position.z, '-' + o[2], '#ff9a3a', 0.8); if (o[1] === bn) Ses.yanik(); break; }
      case 'mp': Sahne.mermiPatla(o[1], o[2], o[3]); if (o[3] === 'domates') Ses.sicrat(); break;
      case 'yansi': { const v = oyun.k.get(o[1]); if (v) Sahne.partikul(v.h.position.x, 1.2, v.h.position.z, 0xe0f4ff, 12, 4); Ses.blok(); akis(`🪞 ${kacis(oyuncu(o[1]).ad)} mermiyi geri yolladı!`); break; }
    }
  }
  function puanTabloCiz() {
    if (!oyun) return;
    const sirali = oyun.oyuncular.slice().sort((a, b) => oyun.puan[b.no] - oyun.puan[a.no]);
    $('puanTablo').innerHTML = sirali.map(p => `<li class="${oyun.k.get(p.no)?.olu && oyun.faz === 'arena' ? 'olu' : ''}" style="--r:${renkCss(p.no)}"><span><i>●</i> ${kacis(p.ad)}${p.no === benimNo() ? ' ⭐' : ''}</span><b>${oyun.puan[p.no]}</b></li>`).join('')
      + `<li style="opacity:.7"><span>🏆 Hedef</span><b>${oyun.ayar.hedef}</b></li>`;
  }

  // ---------- Girdi ----------
  addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    tuslar.add(e.code);
    if (e.code === 'KeyK' && mod !== 'tek' && oyun) mikDegistir();
    if (e.code === 'Space' && oyun?.faz === 'arena') e.preventDefault();
  });
  addEventListener('keyup', e => tuslar.delete(e.code));
  addEventListener('blur', () => { tuslar.clear(); sol = sag = false; });
  const kanvas = $('sahne');
  kanvas.addEventListener('mousemove', e => { fareX = e.clientX; fareY = e.clientY; });
  kanvas.addEventListener('mousedown', e => { if (dokun) return; fareX = e.clientX; fareY = e.clientY; if (e.button === 0) sol = true; if (e.button === 2) sag = true; });
  addEventListener('mouseup', e => { if (e.button === 0) sol = false; if (e.button === 2) sag = false; });
  kanvas.addEventListener('contextmenu', e => e.preventDefault());
  // Dokunmatik: çubuk + düğmeler
  const joyEl = $('joystick'), topuz = $('joyTopuz');
  joyEl.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; joy.aktif = true; joy.id = t.identifier; joyHareket(t); }, { passive: false });
  joyEl.addEventListener('touchmove', e => { e.preventDefault(); [...e.changedTouches].forEach(t => { if (t.identifier === joy.id) joyHareket(t); }); }, { passive: false });
  const joyBirak = e => { [...e.changedTouches].forEach(t => { if (t.identifier === joy.id) { joy.aktif = false; joy.x = joy.y = 0; topuz.style.transform = ''; } }); };
  joyEl.addEventListener('touchend', joyBirak); joyEl.addEventListener('touchcancel', joyBirak);
  function joyHareket(t) {
    const r = joyEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (t.clientX - cx) / (r.width / 2), dy = (t.clientY - cy) / (r.height / 2);
    const L = Math.hypot(dx, dy); if (L > 1) { dx /= L; dy /= L; }
    joy.x = dx; joy.y = dy; topuz.style.transform = `translate(${dx * 38}px, ${dy * 38}px)`;
  }
  [[$('vurBtn'), dokunVur], [$('kalkanBtn'), dokunKalkan]].forEach(([b, d]) => {
    b.addEventListener('touchstart', e => { e.preventDefault(); d.basili = true; b.classList.add('basili'); }, { passive: false });
    const bir = e => { e.preventDefault(); d.basili = false; b.classList.remove('basili'); };
    b.addEventListener('touchend', bir, { passive: false }); b.addEventListener('touchcancel', bir, { passive: false });
  });

  // Kendi karakterimi yürüt
  function benAdim(dt) {
    const A = oyun.arena, v = oyun.k.get(benimNo());
    if (!ben || !v) return;
    ben.cd = Math.max(0, ben.cd - dt);
    if (ben.olu || A.f === 'turSonu') return;
    const savas = A.f === 'savas';
    // yön
    let mx = 0, mz = 0;
    if (tuslar.has('KeyW') || tuslar.has('ArrowUp')) mz -= 1;
    if (tuslar.has('KeyS') || tuslar.has('ArrowDown')) mz += 1;
    if (tuslar.has('KeyA') || tuslar.has('ArrowLeft')) mx -= 1;
    if (tuslar.has('KeyD') || tuslar.has('ArrowRight')) mx += 1;
    if (joy.aktif) { mx = joy.x; mz = joy.y; }
    const L = Math.hypot(mx, mz);
    if (L > 1) { mx /= L; mz /= L; }
    const blk = savas && (sag || tuslar.has('ShiftLeft') || tuslar.has('ShiftRight') || dokunKalkan.basili);
    const bay = v.bayrak;
    const hiz = Motor.HIZ_TEMEL * (1 + ben.st.hiz) * (blk ? 0.5 : 1) * (bay & 4 ? 1.5 : 1);
    if (savas) {
      ben.x += mx * hiz * dt + ben.vx * dt; ben.z += mz * hiz * dt + ben.vz * dt;
      const sur = Math.exp(-6 * dt); ben.vx *= sur; ben.vz *= sur;
      // çarpışmalar
      A.sutunlar.forEach(c => { const dx = ben.x - c.x, dz = ben.z - c.z, d = Math.hypot(dx, dz) || 0.01, r = c.r + Motor.OYUNCU_R; if (d < r) { ben.x = c.x + dx / d * r; ben.z = c.z + dz / d * r; } });
      oyun.k.forEach((o, no) => { if (no === benimNo() || o.olu) return; const dx = ben.x - o.x, dz = ben.z - o.z, d = Math.hypot(dx, dz) || 0.01, r = Motor.OYUNCU_R * 2; if (d < r) { ben.x = o.x + dx / d * r; ben.z = o.z + dz / d * r; } });
      const r = Math.hypot(ben.x, ben.z), sinir = A.R - Motor.OYUNCU_R; if (r > sinir) { ben.x *= sinir / r; ben.z *= sinir / r; }
    }
    // nişan
    const s = ben.st.silah;
    if (dokun) {
      let hedef = null, enD = s.tur === 'atis' ? s.menzil : s.menzil * 2 + 2;
      oyun.k.forEach((o, no) => { if (no === benimNo() || o.olu) return; const d = Math.hypot(o.x - ben.x, o.z - ben.z); if (d < enD) { enD = d; hedef = o; } });
      if ((dokunVur.basili || blk) && hedef) ben.yon = Math.atan2(hedef.x - ben.x, hedef.z - ben.z);
      else if (L > 0.1) ben.yon = Math.atan2(mx, mz);
    } else {
      const n = Sahne.zemindeNokta(fareX, fareY);
      if (n && Math.hypot(n.x - ben.x, n.z - ben.z) > 0.2) ben.yon = Math.atan2(n.x - ben.x, n.z - ben.z);
    }
    // vuruş
    const vurIstek = sol || tuslar.has('Space') || dokunVur.basili;
    if (savas && vurIstek && !blk && ben.cd <= 0) {
      ben.cd = s.bekleme;
      Insan.saldir(v.h);
      eve({ tip: 'vur', y: +ben.yon.toFixed(3) });
    }
    v.x = ben.x; v.z = ben.z; v.yon = ben.yon; v.blkYerel = blk;
    v.hizYerel = savas ? L : 0;
    ben.sonYolla += dt;
    if (ben.sonYolla >= 0.05) { ben.sonYolla = 0; eve({ tip: 'k', x: +ben.x.toFixed(2), z: +ben.z.toFixed(2), y: +ben.yon.toFixed(3), b: blk ? 1 : 0 }); }
  }

  // ---------- HUD ----------
  let buyukZaman = null;
  function buyukYazi(ust, alt, sure) {
    const b = $('buyukYazi'); b.innerHTML = `${kacis(ust)}${alt ? `<small>${kacis(alt)}</small>` : ''}`;
    b.classList.add('goster'); clearTimeout(buyukZaman); buyukZaman = setTimeout(() => b.classList.remove('goster'), sure || 1500);
  }
  function akis(html, sinif = '') {
    const d = document.createElement('div'); d.className = sinif; d.innerHTML = html;
    $('akis').prepend(d);
    while ($('akis').children.length > 5) $('akis').lastChild.remove();
    setTimeout(() => d.remove(), 6000);
  }
  function hudCiz() {
    const A = oyun.arena, bn = benimNo(), v = oyun.k.get(bn);
    if (v) {
      const o = Math.max(0, v.can / Math.max(1, v.canMax));
      $('benimCanDolu').style.width = (o * 100) + '%'; $('benimCan').classList.toggle('az', o < 0.3);
      $('benimCanYazi').textContent = `❤️ ${Math.max(0, v.can)} / ${v.canMax}`;
      const b = v.bayrak, et = [];
      if (b & 2) et.push('🔮 Güçlü vuruş'); if (b & 4) et.push('🧪 Hız'); if (b & 8) et.push('🫧 Koruma');
      if (ben && Math.hypot(ben.x, ben.z) > A.zr + 0.2 && !ben.olu) et.push('🔥 Alanın dışındasın!');
      $('etkiler').innerHTML = et.map(x => `<span>${x}</span>`).join('');
    } else $('benimCan').classList.add('gizli');
    const kalan = [...oyun.k.values()].filter(x => !x.olu).length;
    $('kalanYazi').textContent = `⚔️ ${kalan} kişi ayakta`;
    const a = $('alanYazi');
    if (A.f === 'savas') {
      const t = A.s;
      if (t < Motor.ALAN_BAS) { a.textContent = `🔴 Alan ${Math.ceil(Motor.ALAN_BAS - t)} sn sonra daralacak`; a.classList.remove('uyari'); }
      else { a.textContent = '🔴 Alan daralıyor!'; a.classList.toggle('uyari', !!ben && !ben.olu && Math.hypot(ben.x, ben.z) > A.zr - 1); }
    } else a.textContent = '';
  }

  // ---------- Tur sonu / oyun sonu ----------
  function turSonu(m) {
    oyun.puan = m.puanlar.slice();
    oyun.arena && (oyun.arena.f = 'turSonu');
    const bn = benimNo();
    const sag = m.sag;
    setTimeout(() => {
      if (!oyun || oyun.faz !== 'arena') return;
      $('turSonuBaslik').textContent = sag >= 0 ? `${oyuncu(sag).ad.toLocaleUpperCase('tr')} AYAKTA KALDI!` : 'KİMSE KALMADI!';
      const sirali = oyun.oyuncular.slice().sort((a, b) => m.puanlar[b.no] - m.puanlar[a.no]);
      $('turTablo').innerHTML = '<tr><th>Oyuncu</th><th>⚔️</th><th>Bu tur</th><th>Puan</th><th></th></tr>' + sirali.map(p => {
        const arti = m.oldurme[p.no] + (p.no === sag ? 2 : 0);
        return `<tr class="${p.no === bn ? 'ben' : ''}"><td class="ad" style="--r:${renkCss(p.no)}">${p.no === sag ? '👑 ' : ''}${kacis(p.ad)}</td><td>${m.oldurme[p.no]}</td><td class="arti">${arti ? '+' + arti : ''}</td><td><b>${m.puanlar[p.no]}</b></td><td><div class="cubuk"><i style="width:${Math.min(100, m.puanlar[p.no] / m.hedef * 100)}%"></i></div></td></tr>`;
      }).join('');
      ekranGoster('turSonu');
      let kalan = Math.round(m.sure - 1.5);
      const yaz = () => { $('turSonuAlt').textContent = m.bitti ? `🏆 ${oyuncu(m.kazanan).ad} hedefe ulaştı!` : `${m.hedef} puana ilk ulaşan kazanır · Yeni eşya seçimi ${Math.max(0, kalan)} sn sonra`; };
      yaz(); clearInterval(oyun.turSayac); oyun.turSayac = setInterval(() => { kalan--; yaz(); }, 1000);
    }, 1500);
    if (sag === bn && bn >= 0) { buyukYazi('AYAKTA KALDIN! 👑', '+2 puan', 1500); Ses.kazandi(); Sahne.cosku(4); }
    else { Ses.alkis(); Sahne.cosku(3); }
    puanTabloCiz();
  }
  function oyunBitti(m) {
    oyun.bitti = true; oyun.faz = 'bitti';
    clearInterval(oyun.turSayac);
    const bn = benimNo(), kaz = m.sira[0].no;
    $('sonucBaslik').textContent = kaz === bn ? 'KAZANDIN! 🏆' : `${oyuncu(kaz).ad.toLocaleUpperCase('tr')} KAZANDI!`;
    $('sonucSira').innerHTML = m.sira.map(s => `<li style="color:${renkCss(s.no)}"><span style="color:#2a1608">${kacis(oyuncu(s.no).ad)}${s.no === bn ? ' ⭐' : ''} · <b>${s.puan}</b> puan</span></li>`).join('');
    $('tekrarBtn').classList.toggle('gizli', !yonetici()); $('lobiyeBtn').textContent = '↩ Bekleme odası';
    $('sonucBekle').classList.toggle('gizli', yonetici());
    ekranGoster('sonuc');
    (kaz === bn ? Ses.kazandi : Ses.kaybetti)();
    // kazanan ortada kutlama yapar
    oyun.kutlayan = kaz;
    oyun.k.forEach((v, no) => { v.olu = false; v.bayrak = 0; });
    Sahne.gucleriTemizle(); Sahne.mermileriCiz([]); Sahne.arenaKur(10 + oyun.oyuncular.length, []);
    cizgiDiz();
  }

  // ---------- Ana döngü ----------
  let sonT = performance.now(), sonZarCiz = 0;
  function dongu() {
    requestAnimationFrame(dongu);
    const simdi = performance.now(), dt = Math.min(0.05, (simdi - sonT) / 1000); sonT = simdi;
    kare(dt, simdi);
  }
  function kare(dt, simdi = performance.now()) {
    if (oyun) {
      if (oyun.faz === 'draft') {
        if (oyun.d && oyun.d.faz === 'zar' && simdi - sonZarCiz > 90) { sonZarCiz = simdi; zarlariCiz(); }
        sureCiz();
        const siradaki = oyun.d && oyun.d.faz === 'secim' ? oyun.d.sira[oyun.d.siraIdx] : -1;
        oyun.k.forEach((v, no) => {
          Insan.oynat(v.h, { dt, hiz: 0, blk: false, olu: false, kutla: no === siradaki });
          v.h.position.y = no === siradaki ? Math.abs(Math.sin(simdi / 180)) * 0.15 : 0;
        });
        oyun.imlec.forEach((el, no) => { el.style.opacity = simdi - (+el.dataset.t || 0) > 2500 ? '0.2' : '1'; });
      } else if (oyun.faz === 'arena' && oyun.arena) {
        benAdim(dt);
        oyun.k.forEach((v, no) => {
          if (no !== benimNo() || !ben) {
            const k = Math.min(1, dt * 14);
            const ox = v.x, oz = v.z;
            v.x += (v.hx - v.x) * k; v.z += (v.hz - v.z) * k;
            let fy = v.hyon - v.yon; fy = Math.atan2(Math.sin(fy), Math.cos(fy)); v.yon += fy * k;
            v.hizYerel = Math.min(1, Math.hypot(v.x - ox, v.z - oz) / dt / 4);
            v.blkYerel = !!(v.bayrak & 1);
          }
          v.h.position.set(v.x, 0, v.z); v.h.rotation.y = v.yon;
          Insan.oynat(v.h, { dt, hiz: v.hizYerel || 0, blk: v.blkYerel, olu: v.olu });
          Sahne.etiketCiz(v.et, v.can, v.canMax, v.olu);
          v.et.visible = !v.olu;
          efektCiz(v, dt);
        });
        hudCiz();
        const A = oyun.arena;
        const canli = ben && !ben.olu;
        const kamR = canli ? Math.max(6.5, Math.min(10, A.zr + 2.5)) : Math.min(A.R + 1, A.zr + 3);
        Sahne.arenaKamera(canli ? ben.x * 0.85 : 0, canli ? ben.z * 0.85 : 0, kamR);
      } else if (oyun.faz === 'bitti') {
        oyun.k.forEach((v, no) => { Insan.oynat(v.h, { dt, hiz: 0, kutla: no === oyun.kutlayan }); v.h.position.y = no === oyun.kutlayan ? Math.abs(Math.sin(simdi / 160)) * 0.3 : 0; });
      }
    }
    Sahne.ciz();
  }
  // güçlendirme görünüşü (mor eller, mavi iz, balon)
  function efektCiz(v, dt) {
    const b = v.olu ? 0 : v.bayrak;
    if (!v.efekt) {
      const balon = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8af0ff, transparent: true, opacity: 0.22, depthWrite: false }));
      balon.position.y = 1.0; v.h.add(balon);
      const halka = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.85, 24), new THREE.MeshBasicMaterial({ color: 0xa04ae0, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      halka.rotation.x = -Math.PI / 2; halka.position.y = 0.05; v.h.add(halka);
      v.efekt = { balon, halka, iz: 0 };
    }
    v.efekt.balon.visible = !!(b & 8);
    v.efekt.halka.visible = !!(b & 2);
    if (b & 2) v.efekt.halka.rotation.z += dt * 3;
    if (b & 4) { v.efekt.iz += dt; if (v.efekt.iz > 0.08) { v.efekt.iz = 0; Sahne.partikul(v.x, 0.2, v.z, 0x2fc8ff, 1, 0.8, 0.4); } }
  }
  requestAnimationFrame(dongu);

  // testler için: tuslar + kare ile oyuncuyu elle yürütmek mümkün
  return { get oyun() { return oyun; }, get ben() { return ben; }, mesaj, SURUM, kare, tuslar, fareAyarla(x, y, s) { fareX = x; fareY = y; sol = !!s; } };
})();
