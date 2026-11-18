// =============================================================
// Zarena Savaşları - oyuncunun tarafı: ekranlar, bekleme odası, zar ve eşya seçimi,
// fare imleçleri, arenada yürüme / nişan / vuruş / kalkan, HUD.
// Oyunun kuralları evde (motor.js). Kendi yerini oyuncu hesaplar ve eve yollar.
// =============================================================

const Oyun = (() => {
  const SURUM = 3;   // sw.js ONBELLEK numarasıyla aynı tut; oyuncular farklı sürümdeyse uyarı çıkar
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
    Masa.temizle();
    oyun = null; ben = null;
    $('imlecler').innerHTML = '';
    if (document.pointerLockElement) document.exitPointerLock();
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

  // ================= EŞYA SEÇİMİ (3D masa) =================
  // Kamera masanın etrafında fareyle döndürülebilir. Herkes zarını kendi atar, sonra eşyalar masaya çıkar.
  function draftKur() {
    oyun.faz = 'draft';
    Sahne.gucleriTemizle(); Sahne.mermileriCiz([]);
    Sahne.arenaKur(10 + oyun.oyuncular.length, []);
    Masa.kur(oyun.oyuncular.length);
    oyuncularMasaya();
    kameraMasa(true);
    ekranGoster('draft');
    $('draftBanner').classList.remove('goster');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function oyuncularMasaya() {
    oyun.k.forEach((v, no) => {
      const y = Masa.yer(no);
      v.h.position.set(y.x, 0, y.z); v.h.rotation.y = y.yon; v.h.scale.setScalar(1); v.h.visible = true;
      v.x = v.hx = y.x; v.z = v.hz = y.z; v.yon = v.hyon = y.yon; v.olu = false; v.bayrak = 0;
      v.et.visible = true; v.et.scale.set(1.4, 0.44, 1); v.et.position.y = 2.25;
      Sahne.etiketCiz(v.et, 1, 1, true);
      if (v.efekt) { v.efekt.balon.visible = false; v.efekt.halka.visible = false; }
    });
  }
  function kameraMasa(hemen) {
    const k = Masa.masaKenar(), dik = innerWidth < innerHeight;
    const mesafe = Math.max(6.2, k.W * 0.85 + 2.6) * (dik ? 1.35 : 1);
    Sahne.yorunge({ hedef: new THREE.Vector3(0, 1.15, -0.6), yaw: 0, pitch: 0.5, mesafe });
    if (hemen) Sahne.kameraSifirla();
  }
  $('kameraSifirBtn').onclick = () => kameraMasa(false);

  function draftGeldi(m) {
    if (oyun.faz !== 'draft') draftKur();
    const onceki = oyun.d;
    const anahtar = `${m.draftNo}.${m.tur}`;
    if (m.faz !== 'bekle' && anahtar !== oyun.turAnahtar) {   // yeni tur: masa boşalır
      oyun.turAnahtar = anahtar;
      Masa.kur(oyun.oyuncular.length); oyuncularMasaya();
      oyun.zarGorulen = new Set(); oyun.esyaCikti = false; oyun.ucanlar = new Set(); oyun.giyinecek = new Set(); oyun.secili = -1;
      $('esyaBilgi').classList.add('gizli');
      if (m.tur === 0) banner(`🎲 YENİ EŞYA SEÇİMİ`, 'Herkes zarını atsın! Büyük atan ilk seçer');
      else banner(`🎲 TUR ${m.tur + 1} / ${m.turSay}`, 'Zarını at!');
    }
    oyun.d = m; m.alindi = performance.now();
    // Atılan zarlar (her aşamada her oyuncunun zarı bir kez yuvarlanır)
    const sonA = m.asamalar.length - 1;
    m.asamalar.forEach((a, k) => Object.keys(a).forEach(nos => {
      const no = +nos, key = `${k}.${no}`;
      if (oyun.zarGorulen.has(key)) return;
      oyun.zarGorulen.add(key);
      if (k < sonA && m.asamalar.slice(k + 1).some(b => b[no] !== undefined)) return;   // eski atış
      if (k < sonA && m.esit && m.esit.flat().includes(no) && m.faz !== 'zarBitti') return;
      Masa.zarAt(no, a[no], Insan.RENKLER[oyuncu(no).renk]);
      Insan.zarAt(oyun.k.get(no).h);
      Ses.zar();
    }));
    // Eşitlik
    if (m.faz === 'zarEsit' && onceki?.faz !== 'zarEsit') {
      const adlar = m.esit.map(g => g.map(no => oyuncu(no).ad).join(' ve ')).join(', ');
      banner('⚖️ EŞİT!', `${adlar} yeniden atacak`);
      Ses.kotuSec();
      const kalkacak = m.esit.flat();
      setTimeout(() => Masa.zarKaldir(kalkacak), 1300);
    }
    // Sıra belli oldu → eşyalar masaya çıkar
    if (m.faz === 'zarBitti' && onceki?.faz !== 'zarBitti') {
      Masa.siraGoster(m.sira);
      banner(`🥇 ${oyuncu(m.sira[0]).ad} ilk seçiyor!`, 'Eşyalar masaya geliyor…');
      Ses.sira();
      setTimeout(() => { if (oyun?.d && !oyun.esyaCikti && oyun.turAnahtar === anahtar) { Masa.zarlariTopla(); Masa.esyalariCikar(oyun.d.esyalar, oyun.d.alinan); oyun.esyaCikti = true; } }, 1500);
    }
    if ((m.faz === 'secim' || m.faz === 'bekle') && !oyun.esyaCikti) { Masa.zarlariTopla(); Masa.esyalariCikar(m.esyalar, m.alinan, true); oyun.esyaCikti = true; }
    // Biri eşya aldı → eşya uçup ona gider, gelince giyer
    if (m.son && !oyun.ucanlar.has(m.son.i)) {
      oyun.ucanlar.add(m.son.i);
      const { no, i, oto } = m.son, x = E.al(m.esyalar[i]);
      oyun.giyinecek.add(no);
      Masa.esyaUcur(i, no, () => { if (!oyun) return; oyun.giyinecek.delete(no); const v = oyun.k.get(no); Insan.giydir(v.h, oyun.d.kusam[no]); Insan.zarAt(v.h); kusamimCiz(); kararCiz(); siraPanelCiz(); });
      banner(`${kacisYok(oyuncu(no).ad)} → ${x.emoji} ${x.ad}`, oto ? '⏱️ Süre bitti, en kötüsü verildi!' : `${E.YUVA_EMOJI[x.yuva]} ${E.YUVA_AD[x.yuva]}`, renkCss(no));
      (oto ? Ses.kotuSec : Ses.sec)();
      if (oyun.secili === i) { oyun.secili = -1; $('esyaBilgi').classList.add('gizli'); }
    }
    // Sıra bende mi?
    const siradaki = m.faz === 'secim' ? m.sira[m.siraIdx] : -1;
    if (siradaki === benimNo() && oyun.sonSiraSes !== `${anahtar}.${m.siraIdx}`) { oyun.sonSiraSes = `${anahtar}.${m.siraIdx}`; Ses.sira(); setTimeout(() => banner('👉 SIRA SENDE!', 'Masadan bir eşyaya tıkla'), 900); }
    if (m.faz === 'bekle' && onceki?.faz !== 'bekle' && m.sonraki === 'arena') setTimeout(() => banner('⚔️ HERKES KUŞANDI!', 'Arenaya çıkılıyor…'), 900);
    // Uçan eşyası olmayanlar hemen giyinir
    m.kusam.forEach((k, no) => { if (!oyun.giyinecek.has(no)) Insan.giydir(oyun.k.get(no).h, k); });
    siraPanelCiz(); kusamimCiz(); draftDurumCiz(); bilgiCiz(); kararCiz();
  }
  // "Yenisini giy / Eskisini koru": aynı yuvaya ikinci eşya gelince
  function kararCiz() {
    const d = oyun?.d, bn = benimNo(), kutu = $('kararKutu');
    const liste = d && bn >= 0 ? (d.kararlar?.[bn] || []) : [];
    if (!liste.length || oyun.giyinecek?.has(bn)) { kutu.classList.add('gizli'); return; }
    const id = liste[0], x = E.al(id), eski = E.al((d.kusam[bn] || {})[x.yuva]);
    if (kutu.dataset.id === id && !kutu.classList.contains('gizli')) return;
    kutu.dataset.id = id;
    const kart = (e, baslik, sinif) => `<div class="kkKart ${sinif} p${e.p}"><div class="kkBaslik">${baslik}</div><div class="kkEmo">${e.emoji}</div><div class="kkAd">${kacis(e.ad)}</div><div class="kkYildiz">${'★'.repeat(Math.max(1, Math.round(e.p / 2)))}${'☆'.repeat(5 - Math.max(1, Math.round(e.p / 2)))}</div><ul>${ozellikYazi(e).map(t => `<li>${t}</li>`).join('')}</ul></div>`;
    const iyisi = x.p > (eski?.p ?? -1) ? 'yeni' : 'eski';
    kutu.innerHTML = `<div class="kkUst">${E.YUVA_EMOJI[x.yuva]} Bu yuvada zaten eşyan var! Hangisi kalsın?</div>
      <div class="kkKartlar">${kart(x, '🆕 Yeni gelen', iyisi === 'yeni' ? 'iyi' : '')}<div class="kkVs">VS</div>${eski ? kart(eski, '🎒 Üstündeki', iyisi === 'eski' ? 'iyi' : '') : ''}</div>
      <div class="kkDugmeler"><button id="kkGiyBtn" class="ana">🔄 Yenisini giy</button><button id="kkKoruBtn">✋ Eskisini koru</button></div>
      <div class="kkNot">Seçmezsen arena başlarken iyi olan (${iyisi === 'yeni' ? x.emoji + ' ' + kacis(x.ad) : eski.emoji + ' ' + kacis(eski.ad)}) kendiliğinden seçilir.${liste.length > 1 ? ` · ${liste.length - 1} karar daha bekliyor` : ''}</div>`;
    kutu.classList.remove('gizli');
    $('kkGiyBtn').onclick = () => kararVer(id, true);
    $('kkKoruBtn').onclick = () => kararVer(id, false);
    Ses.sira();
  }
  function kararVer(id, giy) {
    const kutu = $('kararKutu'); kutu.classList.add('gizli'); kutu.dataset.id = '';
    eve({ tip: 'karar', id, giy });
    banner(giy ? '🔄 YENİSİNİ GİYDİN' : '✋ ESKİSİNİ KORUDUN', E.al(id).ad + (giy ? ' üstünde' : ' masaya bırakıldı'));
  }
  const kacisYok = s => String(s);
  let bannerZaman = null;
  function banner(ust, alt, renk) {
    const b = $('draftBanner');
    b.innerHTML = `<div style="${renk ? `color:${renk}` : ''}">${kacis(ust)}</div>${alt ? `<small>${kacis(alt)}</small>` : ''}`;
    b.classList.remove('goster'); void b.offsetWidth; b.classList.add('goster');
    clearTimeout(bannerZaman); bannerZaman = setTimeout(() => b.classList.remove('goster'), 2200);
  }
  function draftDurumCiz() {
    const d = oyun.d, bn = benimNo();
    let t = '';
    if (d.faz === 'zar') {
      if (d.bekleyen.includes(bn)) t = '🎲 <b style="--r:#7aff5a">Zarını at!</b> Düğmeye ya da Boşluk tuşuna bas';
      else t = `🎲 Zar bekleniyor: ${d.bekleyen.map(no => `<b style="--r:${renkCss(no)}">${kacis(oyuncu(no).ad)}</b>`).join(', ')}`;
    } else if (d.faz === 'zarEsit') t = '⚖️ Eşit atanlar kendi aralarında yeniden atacak';
    else if (d.faz === 'zarBitti') t = '📋 Sıra belli oldu! Eşyalar masaya geliyor…';
    else if (d.faz === 'secim') { const s = d.sira[d.siraIdx]; t = s === bn ? '👉 <b style="--r:#7aff5a">Sıra sende!</b> Masadan bir eşyaya tıkla' : `⏳ Sıra <b style="--r:${renkCss(s)}">${kacis(oyuncu(s).ad)}</b> oyuncusunda`; }
    else if (d.faz === 'bekle') t = d.sonraki === 'arena' ? '⚔️ Herkes kuşandı! Arenaya çıkılıyor…' : 'Sonraki tur geliyor…';
    $('draftDurum').innerHTML = t;
    $('draftBaslik').textContent = `🎲 Eşya seçimi · Tur ${Math.min(d.tur + 1, d.turSay)} / ${d.turSay}`;
    const zarBende = d.faz === 'zar' && d.bekleyen.includes(bn);
    $('zarAtBtn').classList.toggle('gizli', !zarBende);
  }
  function zarAtIstek() {
    const d = oyun?.d;
    if (!d || d.faz !== 'zar' || !d.bekleyen.includes(benimNo())) return;
    $('zarAtBtn').classList.add('gizli');
    eve({ tip: 'zarAt' });
  }
  $('zarAtBtn').onclick = zarAtIstek;
  // Sol panel: kim kaç attı, sırası, bu tur ne aldı, üstünde neler var
  function siraPanelCiz() {
    const d = oyun.d, bn = benimNo();
    const siraNo = d.sira ? Object.fromEntries(d.sira.map((no, k) => [no, k + 1])) : {};
    const aldigi = {}; Object.entries(d.alinan).forEach(([i, no]) => { aldigi[no] = d.esyalar[i]; });
    const liste = d.sira || oyun.oyuncular.map(p => p.no);
    const siradaki = d.faz === 'secim' ? d.sira[d.siraIdx] : -1;
    $('siraPanel').innerHTML = `<div class="spBaslik">${d.sira ? '📋 Seçim sırası' : '🎲 Zarlar'}</div>` + liste.map(no => {
      const zarlar = d.asamalar.map(a => a[no]).filter(v => v !== undefined);
      const bekliyor = d.faz === 'zar' && d.bekleyen.includes(no);
      const zarHtml = zarlar.map((v, k) => `<span class="mzar${k < zarlar.length - 1 ? ' eski' : ''}">${zarYuz(v)}</span>`).join('') || (bekliyor ? '<span class="mzar bos">…</span>' : '');
      const al = aldigi[no] ? E.al(aldigi[no]) : null;
      const kusam = d.kusam[no] || {};
      const ust = E.YUVALAR.map(y => kusam[y] ? E.al(kusam[y]).emoji : '').join('');
      const dusunuyor = (d.kararlar?.[no] || []).length && !oyun.giyinecek?.has(no);
      return `<div class="spSatir${no === siradaki ? ' siradaki' : ''}${no === bn ? ' ben' : ''}" style="--r:${renkCss(no)}">
        <span class="spNo">${siraNo[no] || ''}</span><div class="spOrta"><div class="spAd">${kacis(oyuncu(no).ad)}${no === bn ? ' ⭐' : ''}${bekliyor ? ' <i>atıyor…</i>' : ''}</div>
        <div class="spAlt">${al ? `<b>${al.emoji} ${kacis(al.ad)}</b>${dusunuyor ? ' <i class="dus">🤔 giysin mi?</i>' : ''}` : no === siradaki ? '<b class="dusun">seçiyor…</b>' : `<span class="ust">${ust}</span>`}</div></div><div class="spZar">${zarHtml}</div></div>`;
    }).join('');
  }
  function kusamimCiz() {
    const no = benimNo(); if (no < 0 || !oyun?.d) { $('kusamim').innerHTML = ''; return; }
    const k = oyun.giyinecek?.has(no) ? (oyun.oncekiKusam || {}) : (oyun.d.kusam[no] || {});
    oyun.oncekiKusam = k;
    const st = E.statlar(k);
    $('kusamim').innerHTML = E.YUVALAR.map(y => { const x = E.al(k[y]); return `<div class="yuvaKutu${x ? '' : ' bos'}"><b>${x ? x.emoji : E.YUVA_EMOJI[y]}</b>${x ? kacis(x.ad) : E.YUVA_AD[y] + ' boş'}</div>`; }).join('')
      + `<div class="statYazi">❤️ ${st.canMax} · 🪨 %${Math.round(st.zirh * 100)} · 💨 ${st.hiz >= 0 ? '+' : ''}${Math.round(st.hiz * 100)}% · ${st.silah.emoji} ${st.silah.hasar}</div>`;
  }
  function ozellikYazi(x) {
    const p = [];
    if (x.yuva === 'silah') { p.push(`💥 Hasar ${x.hasar}`); p.push(x.tur === 'atis' ? `🎯 Uzaktan ${x.menzil} m` : `📏 Yakın ${x.menzil} m`); p.push(`⏱️ ${x.bekleme} sn`); }
    if (x.yuva === 'kalkan') p.push(`🛡️ Blok %${Math.round(x.blok * 100)}${x.yansit ? ' · ↩️ mermiyi geri yollar' : ''}`);
    if (x.can) p.push(`❤️ +${x.can} can`);
    if (x.zirh) p.push(`🪨 %${Math.round(x.zirh * 100)} zırh`);
    if (x.hiz) p.push(`${x.hiz > 0 ? '💨 +' : '🐌 -'}${Math.round(Math.abs(x.hiz) * 100)}% hız`);
    return p;
  }
  // Seçilen / üstüne gelinen eşyanın bilgisi
  function bilgiCiz() {
    const d = oyun?.d, i = oyun?.secili ?? -1, b = $('esyaBilgi');
    if (!d || i < 0 || d.alinan[i] !== undefined || !oyun.esyaCikti) { b.classList.add('gizli'); return; }
    const x = E.al(d.esyalar[i]), kusam = d.kusam[benimNo()] || {}, eski = kusam[x.yuva] ? E.al(kusam[x.yuva]) : null;
    const benim = d.faz === 'secim' && d.sira[d.siraIdx] === benimNo();
    const yildiz = Math.max(1, Math.round(x.p / 2));
    b.className = 'p' + x.p;
    b.innerHTML = `<div class="ebUst"><span class="ebEmo">${x.emoji}</span><div><div class="ebAd">${kacis(x.ad)}</div><div class="ebYuva">${E.YUVA_EMOJI[x.yuva]} ${E.YUVA_AD[x.yuva]} · <span class="yildiz">${'★'.repeat(yildiz)}${'☆'.repeat(5 - yildiz)}</span></div></div></div>
      <ul>${ozellikYazi(x).map(s => `<li>${s}</li>`).join('')}</ul>
      ${eski ? `<div class="ebEski">Yerine gidecek: ${eski.emoji} ${kacis(eski.ad)}</div>` : ''}
      ${benim ? '<button id="ebAlBtn" class="ana">✅ Bunu al</button>' : ''}`;
    if (benim) $('ebAlBtn').onclick = () => esyaSec(i);
  }
  function esyaSec(i) {
    const d = oyun?.d; if (!d) return;
    if (d.faz !== 'secim' || d.sira[d.siraIdx] !== benimNo() || d.alinan[i] !== undefined) return;
    eve({ tip: 'sec', i });
  }
  function sureCiz() {
    const d = oyun?.d; if (!d) return;
    const kalan = Math.max(0, d.sure - (performance.now() - d.alindi) / 1000);
    const top = d.faz === 'secim' ? Motor.SECIM_SURE : d.faz === 'zar' ? Motor.ZAR_SURE : 0;
    $('draftSureDolu').style.width = top ? (kalan / top * 100) + '%' : '0%';
    const benimIs = (d.faz === 'secim' && d.sira[d.siraIdx] === benimNo()) || (d.faz === 'zar' && d.bekleyen.includes(benimNo()));
    if (benimIs && kalan < 3.5 && Math.ceil(kalan) !== oyun.sonTik) { oyun.sonTik = Math.ceil(kalan); Ses.tik(); }
    $('draftSureYazi').textContent = top ? Math.ceil(kalan) + ' sn' : '';
  }

  // ---------- Masa kamerası (fareyle döndür) + imleçler + tıklama ----------
  const kanvas = $('sahne');
  const surukle = { basili: false, x: 0, y: 0, oynadi: false, id: null };
  let sonImlec = 0;
  kanvas.addEventListener('pointerdown', e => {
    if (!oyun || (oyun.faz !== 'draft' && oyun.faz !== 'bitti')) return;
    Object.assign(surukle, { basili: true, x: e.clientX, y: e.clientY, oynadi: false, id: e.pointerId });
  });
  kanvas.addEventListener('pointermove', e => {
    if (!oyun || (oyun.faz !== 'draft' && oyun.faz !== 'bitti')) return;
    if (surukle.basili && e.pointerId === surukle.id) {
      const dx = e.clientX - surukle.x, dy = e.clientY - surukle.y;
      if (!surukle.oynadi && Math.hypot(dx, dy) > 6) surukle.oynadi = true;
      if (surukle.oynadi) {
        const y = Sahne.yorungeAl();
        Sahne.yorunge({ yaw: y.yaw - dx * 0.007, pitch: Math.max(0.08, Math.min(1.35, y.pitch + dy * 0.005)) });
        surukle.x = e.clientX; surukle.y = e.clientY;
      }
      return;
    }
    if (oyun.faz !== 'draft' || e.pointerType === 'touch') return;
    const i = oyun.esyaCikti ? Masa.esyaBul(e.clientX, e.clientY) : -1;
    if (i !== oyun.uzerinde) { oyun.uzerinde = i; Masa.vurgula(i); if (i >= 0) { oyun.secili = i; bilgiCiz(); } kanvas.style.cursor = i >= 0 ? 'pointer' : 'grab'; }
    imlecYolla(e.clientX, e.clientY);
  });
  addEventListener('pointerup', e => {
    if (!surukle.basili || e.pointerId !== surukle.id) return;
    surukle.basili = false;
    if (surukle.oynadi || !oyun || oyun.faz !== 'draft') return;
    // tıklama (sürükleme değil)
    imlecYolla(e.clientX, e.clientY);
    const i = oyun.esyaCikti ? Masa.esyaBul(e.clientX, e.clientY) : -1;
    if (i < 0) return;
    oyun.secili = i; Masa.vurgula(i); bilgiCiz();
    const d = oyun.d;
    if (e.pointerType !== 'touch' && d.faz === 'secim' && d.sira[d.siraIdx] === benimNo()) esyaSec(i);   // telefonda önce bilgi, sonra "Bunu al"
  });
  kanvas.addEventListener('wheel', e => {
    if (!oyun || (oyun.faz !== 'draft' && oyun.faz !== 'bitti')) return;
    e.preventDefault();
    const y = Sahne.yorungeAl();
    Sahne.yorunge({ mesafe: Math.max(3.5, Math.min(22, y.mesafe * (e.deltaY > 0 ? 1.1 : 0.9))) });
  }, { passive: false });
  function imlecYolla(cx, cy) {
    const simdi = performance.now();
    if (simdi - sonImlec < 80) return;
    const n = Masa.masadaNokta(cx, cy); if (!n) return;
    sonImlec = simdi;
    eve({ tip: 'im', x: +n.x.toFixed(2), z: +n.z.toFixed(2) });
  }
  const IMLEC_SVG = r => `<svg viewBox="0 0 24 24"><path d="M3 2 L3 20 L8 15 L12 23 L15 21.5 L11 14 L18 14 Z" fill="${r}" stroke="#000" stroke-width="1.5"/></svg>`;
  function imlecGeldi(l) {
    l.forEach(([no, x, z]) => {
      if (no === benimNo()) return;
      let c = oyun.imlec.get(no);
      if (!c) {
        const el = document.createElement('div'); el.className = 'imlec';
        el.innerHTML = IMLEC_SVG(renkCss(no)) + `<span style="--r:${renkCss(no)}">${kacis(oyuncu(no).ad)}</span>`;
        $('imlecler').appendChild(el); c = { el, x, z, hx: x, hz: z, t: 0 }; oyun.imlec.set(no, c);
      }
      c.hx = x; c.hz = z; c.t = performance.now();
    });
  }
  function imlecleriCiz(dt, simdi) {
    oyun.imlec.forEach(c => {
      c.x += (c.hx - c.x) * Math.min(1, dt * 12); c.z += (c.hz - c.z) * Math.min(1, dt * 12);
      const p = Masa.ekranda(c.x, c.z);
      c.el.style.transform = `translate(${p.x - 3}px, ${p.y - 3}px)`;
      c.el.style.opacity = !p.onde ? 0 : simdi - c.t > 2500 ? 0.25 : 1;
    });
  }

  // ================= ARENA (karakterin arkasından 3D) =================
  let ben = null;
  const tuslar = new Set();
  let sol = false, sag = false, tekVur = false;
  const joy = { aktif: false, id: null, x: 0, y: 0 }, dokunVur = { basili: false }, dokunKalkan = { basili: false }, bakis = { id: null, x: 0, y: 0 };
  function arenaKur(m) {
    $('kararKutu').classList.add('gizli'); $('kararKutu').dataset.id = '';
    oyun.faz = 'arena'; oyun.arena = { R: m.R, zr: m.R, f: 'geri', s: 3, sutunlar: m.sutunlar, sonSayi: -1 };
    Masa.temizle();
    Sahne.arenaKur(m.R, m.sutunlar);
    oyun.imlec.forEach(c => c.el.remove()); oyun.imlec.clear();
    oyun.d = null; oyun.turAnahtar = null;
    m.oyuncular.forEach(p => {
      const v = oyun.k.get(p.no);
      Object.assign(v, { x: p.x, z: p.z, hx: p.x, hz: p.z, yon: p.yon, hyon: p.yon, can: p.can, canMax: p.canMax, bayrak: 0, kusam: p.kusam, olu: false, st: E.statlar(p.kusam) });
      Insan.giydir(v.h, p.kusam);
      v.h.position.set(p.x, 0, p.z); v.h.rotation.y = p.yon; v.h.scale.setScalar(1);
      Sahne.etiketCiz(v.et, p.can, p.canMax, false); v.et.scale.set(1.5, 0.47, 1); v.et.position.y = 2.3;
      v.et.visible = p.no !== benimNo();
    });
    const bn = benimNo();
    if (bn >= 0) { const p = m.oyuncular[bn]; ben = { x: p.x, z: p.z, yon: p.yon, vx: 0, vz: 0, st: E.statlar(p.kusam), cd: 0, olu: false, sonYolla: 0 }; oyun.yaw = p.yon; }
    else { ben = null; oyun.yaw = 0; }
    oyun.pitch = -0.08; oyun.izle = -1;
    kameraArena(0);
    ekranGoster('hud'); mikCiz();
    $('izleYazi').classList.add('gizli'); document.body.classList.remove('izliyor');
    $('akis').innerHTML = '';
    puanTabloCiz(); ipucuCiz();
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
        Sahne.sayiGoster(x, 2.1, z, '-' + dmg, blk ? '#bcd' : mana ? '#d58aff' : no === bn ? '#ff5a4a' : '#fff', (mana ? 1.3 : 1) * 0.6);
        Sahne.partikul(x, 1.2, z, blk ? 0xdddddd : 0xd8202a, blk ? 8 : 10, 3);
        if (blk) Ses.blok(); else Ses.vur(Math.min(1.4, 0.5 + dmg / 20));
        if (no === bn) { Sahne.sars(blk ? 0.06 : 0.14); $('hasarFlas').classList.remove('goster'); void $('hasarFlas').offsetWidth; $('hasarFlas').classList.add('goster'); }
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
        if (no === bn) { if (ben) ben.olu = true; buyukYazi('YERE SERİLDİN!', katil >= 0 ? `${oyuncu(katil).ad} seni devirdi` : 'Alanın dışında kaldın', 2000); document.body.classList.add('izliyor'); oyun.izle = katil >= 0 ? katil : -1; }
        if (katil === bn && katil >= 0) buyukYazi('+1 PUAN!', `${oyuncu(no).ad} yere serildi`, 1200);
        if (no === oyun.izle) setTimeout(() => sonrakiniIzle(), 1500);
        puanTabloCiz();
        break;
      }
      case 'al': {
        const [, no, tur] = o, v = oyun.k.get(no);
        const AD = { mana: '🔮 Mana', hiz: '🧪 Hız iksiri', can: '❤️ Can iksiri', koruma: '🫧 Koruma balonu' };
        if (v) Sahne.partikul(v.h.position.x, 1, v.h.position.z, Sahne.GUC_RENK[tur], 16, 3);
        if (no === bn) { Ses.guc(tur); buyukYazi(AD[tur] + '!', { mana: '8 saniye güçlü vuruş', hiz: '6 saniye hızlı koşu', can: '+40 can', koruma: '6 saniye yarım hasar' }[tur], 1100); }
        else akis(`${AD[tur]}: ${kacis(oyuncu(no).ad)} aldı`);
        if (tur === 'can' && v) Sahne.sayiGoster(v.h.position.x, 2.1, v.h.position.z, '+40', '#7aee5a', 0.6);
        break;
      }
      case 'alan': buyukYazi('ALAN DARALIYOR!', 'Kırmızının dışında kalma, ortaya gel!', 1800); Ses.alan(); break;
      case 'alanHit': { const v = oyun.k.get(o[1]); if (v) Sahne.sayiGoster(v.h.position.x, 2.1, v.h.position.z, '-' + o[2], '#ff9a3a', 0.5); if (o[1] === bn) Ses.yanik(); break; }
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
  // Ölünce başkasını izle
  function sonrakiniIzle() {
    if (!oyun?.arena) return;
    const canli = [...oyun.k.entries()].filter(([no, v]) => !v.olu).map(([no]) => no);
    if (!canli.length) return;
    const i = canli.indexOf(oyun.izle);
    oyun.izle = canli[(i + 1) % canli.length];
  }

  // ---------- Girdi ----------
  addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName || '')) return;
    tuslar.add(e.code);
    if (e.code === 'KeyK' && mod !== 'tek' && oyun) mikDegistir();
    if (e.code === 'Space' && oyun) {
      e.preventDefault();
      if (oyun.faz === 'draft') zarAtIstek();
      else if (oyun.faz === 'arena' && ben?.olu) sonrakiniIzle();
    }
    if ((e.code === 'AltLeft' || e.code === 'AltRight') && document.pointerLockElement) { e.preventDefault(); document.exitPointerLock(); }
  });
  addEventListener('keyup', e => tuslar.delete(e.code));
  addEventListener('blur', () => { tuslar.clear(); sol = sag = false; });
  // Fare: ekrana tıklayınca kilitlenir, fareyle etrafa bakılır. Kilitlenemezse basılı sürükleyerek bakılır.
  const arenaDa = () => oyun?.faz === 'arena';
  const fare = { basili: false, oynadi: false, x: 0, y: 0 };
  kanvas.addEventListener('mousedown', e => {
    if (!arenaDa() || dokun) return;
    const kilitli = document.pointerLockElement === kanvas;
    if (!kilitli) {
      try { const p = kanvas.requestPointerLock?.(); if (p?.catch) p.catch(() => {}); } catch (er) { /* kilitlenemiyor */ }
      Object.assign(fare, { basili: true, oynadi: false, x: e.clientX, y: e.clientY });
      if (e.button === 2) sag = true;
      return;
    }
    if (e.button === 0) sol = true;
    if (e.button === 2) sag = true;
  });
  addEventListener('mouseup', e => {
    if (e.button === 0) { sol = false; if (fare.basili && !fare.oynadi && arenaDa() && document.pointerLockElement !== kanvas) tekVur = true; fare.basili = false; }
    if (e.button === 2) { sag = false; fare.basili = false; }
  });
  document.addEventListener('mousemove', e => {
    if (!arenaDa()) return;
    if (document.pointerLockElement === kanvas) { bak(e.movementX * 0.0024, e.movementY * 0.0024); return; }
    if (fare.basili) {
      const dx = e.clientX - fare.x, dy = e.clientY - fare.y;
      if (Math.hypot(dx, dy) > 4) fare.oynadi = true;
      if (fare.oynadi) { bak(dx * 0.005, dy * 0.004); fare.x = e.clientX; fare.y = e.clientY; }
    }
  });
  function bak(dx, dy) { oyun.yaw -= dx; oyun.pitch = Math.max(-0.75, Math.min(0.55, oyun.pitch - dy)); }
  kanvas.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('pointerlockchange', ipucuCiz);
  function ipucuCiz() {
    const kilitli = document.pointerLockElement === kanvas;
    $('ipucu').textContent = dokun ? 'Sol: yürü · Sağda parmağını kaydır: etrafa bak · ⚔️ vur · 🛡️ kalkan'
      : kilitli ? 'WASD yürü · Fare bak · Sol tık vur · Sağ tık / Shift kalkan · Alt: fareyi bırak' : '🖱️ Ekrana tıkla: fareyle etrafa bak (olmazsa basılı tutup sürükle)';
    $('ipucu').classList.toggle('serbest', !kilitli && !dokun);
  }
  // Dokunmatik: sol çubuk + sağda kaydırarak bakış + düğmeler
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
  kanvas.addEventListener('touchstart', e => { if (!arenaDa()) return; const t = e.changedTouches[0]; if (bakis.id === null) Object.assign(bakis, { id: t.identifier, x: t.clientX, y: t.clientY }); if (ben?.olu) sonrakiniIzle(); }, { passive: true });
  kanvas.addEventListener('touchmove', e => { if (!arenaDa()) return; [...e.changedTouches].forEach(t => { if (t.identifier !== bakis.id) return; bak((t.clientX - bakis.x) * 0.006, (t.clientY - bakis.y) * 0.004); bakis.x = t.clientX; bakis.y = t.clientY; }); }, { passive: true });
  const bakisBitti = e => { [...e.changedTouches].forEach(t => { if (t.identifier === bakis.id) bakis.id = null; }); };
  kanvas.addEventListener('touchend', bakisBitti); kanvas.addEventListener('touchcancel', bakisBitti);
  [[$('vurBtn'), dokunVur], [$('kalkanBtn'), dokunKalkan]].forEach(([b, d]) => {
    b.addEventListener('touchstart', e => { e.preventDefault(); d.basili = true; b.classList.add('basili'); }, { passive: false });
    const bir = e => { e.preventDefault(); d.basili = false; b.classList.remove('basili'); };
    b.addEventListener('touchend', bir, { passive: false }); b.addEventListener('touchcancel', bir, { passive: false });
  });

  // Kendi karakterimi yürüt (baktığın yöne göre)
  function benAdim(dt) {
    const A = oyun.arena, v = oyun.k.get(benimNo());
    if (!ben || !v) return;
    ben.cd = Math.max(0, ben.cd - dt);
    if (ben.olu || A.f === 'turSonu') { tekVur = false; return; }
    const savas = A.f === 'savas';
    let ileri = 0, yan = 0;
    if (tuslar.has('KeyW') || tuslar.has('ArrowUp')) ileri += 1;
    if (tuslar.has('KeyS') || tuslar.has('ArrowDown')) ileri -= 1;
    if (tuslar.has('KeyD') || tuslar.has('ArrowRight')) yan += 1;
    if (tuslar.has('KeyA') || tuslar.has('ArrowLeft')) yan -= 1;
    if (joy.aktif) { ileri = -joy.y; yan = joy.x; }
    let L = Math.hypot(ileri, yan);
    if (L > 1) { ileri /= L; yan /= L; L = 1; }
    const s0 = Math.sin(oyun.yaw), c0 = Math.cos(oyun.yaw);
    const mx = s0 * ileri - c0 * yan, mz = c0 * ileri + s0 * yan;
    const blk = savas && (sag || tuslar.has('ShiftLeft') || tuslar.has('ShiftRight') || dokunKalkan.basili);
    const hiz = Motor.HIZ_TEMEL * (1 + ben.st.hiz) * (blk ? 0.5 : 1) * (v.bayrak & 4 ? 1.5 : 1) * (ileri < -0.1 ? 0.8 : 1);
    if (savas) {
      ben.x += mx * hiz * dt + ben.vx * dt; ben.z += mz * hiz * dt + ben.vz * dt;
      const sur = Math.exp(-6 * dt); ben.vx *= sur; ben.vz *= sur;
      A.sutunlar.forEach(c => { const dx = ben.x - c.x, dz = ben.z - c.z, d = Math.hypot(dx, dz) || 0.01, r = c.r + Motor.OYUNCU_R; if (d < r) { ben.x = c.x + dx / d * r; ben.z = c.z + dz / d * r; } });
      oyun.k.forEach((o, no) => { if (no === benimNo() || o.olu) return; const dx = ben.x - o.x, dz = ben.z - o.z, d = Math.hypot(dx, dz) || 0.01, r = Motor.OYUNCU_R * 2; if (d < r) { ben.x = o.x + dx / d * r; ben.z = o.z + dz / d * r; } });
      const r = Math.hypot(ben.x, ben.z), sinir = A.R - Motor.OYUNCU_R; if (r > sinir) { ben.x *= sinir / r; ben.z *= sinir / r; }
    }
    const s = ben.st.silah;
    const vurIstek = sol || tekVur || tuslar.has('KeyF') || dokunVur.basili;
    // Telefonda vururken yakındaki rakibe döner
    if (dokun && (dokunVur.basili || dokunKalkan.basili)) {
      let hedef = null, enA = 0.7, menzil = s.tur === 'atis' ? s.menzil : s.menzil + 2.5;
      oyun.k.forEach((o, no) => {
        if (no === benimNo() || o.olu) return;
        const d = Math.hypot(o.x - ben.x, o.z - ben.z); if (d > menzil) return;
        let fa = Math.atan2(o.x - ben.x, o.z - ben.z) - oyun.yaw; fa = Math.abs(Math.atan2(Math.sin(fa), Math.cos(fa)));
        if (fa < enA) { enA = fa; hedef = o; }
      });
      if (hedef) { let f = Math.atan2(hedef.x - ben.x, hedef.z - ben.z) - oyun.yaw; f = Math.atan2(Math.sin(f), Math.cos(f)); oyun.yaw += f * Math.min(1, dt * 8); }
    }
    // Gövde baktığın yöne döner
    let f = oyun.yaw - ben.yon; f = Math.atan2(Math.sin(f), Math.cos(f)); ben.yon += f * Math.min(1, dt * 14);
    if (savas && vurIstek && !blk && ben.cd <= 0) {
      ben.cd = s.bekleme; ben.yon = oyun.yaw;
      Insan.saldir(v.h);
      eve({ tip: 'vur', y: +oyun.yaw.toFixed(3) });
    }
    tekVur = false;
    v.x = ben.x; v.z = ben.z; v.yon = ben.yon; v.blkYerel = blk;
    v.hizYerel = savas ? L * (ileri < -0.1 ? -1 : 1) : 0;
    ben.sonYolla += dt;
    if (ben.sonYolla >= 0.05) { ben.sonYolla = 0; eve({ tip: 'k', x: +ben.x.toFixed(2), z: +ben.z.toFixed(2), y: +ben.yon.toFixed(3), b: blk ? 1 : 0 }); }
  }
  // Kamera: karakterin arkasından, omuzun üstünden
  function kameraArena() {
    const A = oyun.arena;
    let x, z, yaw = oyun.yaw, pitch = oyun.pitch, uzak = 4.4;
    if (ben && !ben.olu) { x = ben.x; z = ben.z; }
    else {
      if (oyun.izle < 0 || oyun.k.get(oyun.izle)?.olu) sonrakiniIzle();
      const v = oyun.k.get(oyun.izle);
      if (v && !v.olu) { x = v.x; z = v.z; yaw = v.yon; pitch = -0.15; uzak = 4.6; $('izleYazi').innerHTML = `💀 Yere serildin · 👁️ <b style="color:${renkCss(oyun.izle)}">${kacis(oyuncu(oyun.izle).ad)}</b> izleniyor <small>(Boşluk / dokun: sıradaki)</small>`; }
      else { x = 0; z = 0; uzak = 12; pitch = -0.5; }
      $('izleYazi').classList.toggle('gizli', !(ben && ben.olu));
    }
    const cp = Math.cos(pitch), d = { x: Math.sin(yaw) * cp, y: Math.sin(pitch), z: Math.cos(yaw) * cp };
    const sagX = -Math.cos(yaw), sagZ = Math.sin(yaw);
    const bx = x + sagX * 0.62, bz = z + sagZ * 0.62;
    let serbest = uzak;
    for (let t = 0.1; t <= uzak; t += 0.1) {
      const px = bx - d.x * t, pz = bz - d.z * t;
      if (A.sutunlar.some(c => Math.hypot(c.x - px, c.z - pz) < c.r + 0.35) || Math.hypot(px, pz) > A.R + 0.5) { serbest = Math.max(0.6, t - 0.1); break; }
    }
    const poz = new THREE.Vector3(bx - d.x * serbest, Math.max(0.5, 2.75 - d.y * serbest), bz - d.z * serbest);
    const bakNokta = new THREE.Vector3(x + d.x * 15, 1.45 + d.y * 15, z + d.z * 15);
    Sahne.elle(poz, bakNokta);
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
      $('silahYazi').textContent = ben ? `${ben.st.silah.emoji} ${ben.st.silah.ad}${ben.st.kalkan ? ' · ' + ben.st.kalkan.emoji : ''}` : '';
    } else $('benimCan').classList.add('gizli');
    const kalan = [...oyun.k.values()].filter(x => !x.olu).length;
    $('kalanYazi').textContent = `⚔️ ${kalan} kişi ayakta`;
    const a = $('alanYazi');
    if (A.f === 'savas') {
      const t = A.s;
      if (t < Motor.ALAN_BAS) { a.textContent = `🔴 Alan ${Math.ceil(Motor.ALAN_BAS - t)} sn sonra daralacak`; a.classList.remove('uyari'); }
      else { a.textContent = '🔴 Alan daralıyor!'; a.classList.toggle('uyari', !!ben && !ben.olu && Math.hypot(ben.x, ben.z) > A.zr - 1); }
    } else a.textContent = '';
    $('nisan').classList.toggle('gizli', !ben || ben.olu);
  }

  // ---------- Tur sonu / oyun sonu ----------
  function turSonu(m) {
    oyun.puan = m.puanlar.slice();
    oyun.arena && (oyun.arena.f = 'turSonu');
    const bn = benimNo();
    const sagKalan = m.sag;
    if (document.pointerLockElement) document.exitPointerLock();
    setTimeout(() => {
      if (!oyun || oyun.faz !== 'arena') return;
      $('turSonuBaslik').textContent = sagKalan >= 0 ? `${oyuncu(sagKalan).ad.toLocaleUpperCase('tr')} AYAKTA KALDI!` : 'KİMSE KALMADI!';
      const sirali = oyun.oyuncular.slice().sort((a, b) => m.puanlar[b.no] - m.puanlar[a.no]);
      $('turTablo').innerHTML = '<tr><th>Oyuncu</th><th>⚔️</th><th>Bu tur</th><th>Puan</th><th></th></tr>' + sirali.map(p => {
        const arti = m.oldurme[p.no] + (p.no === sagKalan ? 2 : 0);
        return `<tr class="${p.no === bn ? 'ben' : ''}"><td class="ad" style="--r:${renkCss(p.no)}">${p.no === sagKalan ? '👑 ' : ''}${kacis(p.ad)}</td><td>${m.oldurme[p.no]}</td><td class="arti">${arti ? '+' + arti : ''}</td><td><b>${m.puanlar[p.no]}</b></td><td><div class="cubuk"><i style="width:${Math.min(100, m.puanlar[p.no] / m.hedef * 100)}%"></i></div></td></tr>`;
      }).join('');
      ekranGoster('turSonu');
      let kalan = Math.round(m.sure - 1.5);
      const yaz = () => { $('turSonuAlt').textContent = m.bitti ? `🏆 ${oyuncu(m.kazanan).ad} hedefe ulaştı!` : `${m.hedef} puana ilk ulaşan kazanır · Yeni eşya seçimi ${Math.max(0, kalan)} sn sonra`; };
      yaz(); clearInterval(oyun.turSayac); oyun.turSayac = setInterval(() => { kalan--; yaz(); }, 1000);
    }, 1500);
    if (sagKalan === bn && bn >= 0) { buyukYazi('AYAKTA KALDIN! 👑', '+2 puan', 1500); Ses.kazandi(); Sahne.cosku(4); }
    else { Ses.alkis(); Sahne.cosku(3); }
    puanTabloCiz();
  }
  function oyunBitti(m) {
    oyun.bitti = true;
    clearInterval(oyun.turSayac);
    const bn = benimNo(), kaz = m.sira[0].no;
    $('sonucBaslik').textContent = kaz === bn ? 'KAZANDIN! 🏆' : `${oyuncu(kaz).ad.toLocaleUpperCase('tr')} KAZANDI!`;
    $('sonucSira').innerHTML = m.sira.map(s => `<li style="color:${renkCss(s.no)}"><span style="color:#2a1608">${kacis(oyuncu(s.no).ad)}${s.no === bn ? ' ⭐' : ''} · <b>${s.puan}</b> puan</span></li>`).join('');
    $('tekrarBtn').classList.toggle('gizli', !yonetici());
    $('sonucBekle').classList.toggle('gizli', yonetici());
    // Kazanan masanın önünde kutlama yapar
    Sahne.gucleriTemizle(); Sahne.mermileriCiz([]); Sahne.arenaKur(10 + oyun.oyuncular.length, []);
    Masa.kur(oyun.oyuncular.length); oyuncularMasaya(); kameraMasa(true);
    oyun.faz = 'bitti'; oyun.kutlayan = kaz;
    ekranGoster('sonuc');
    if (document.pointerLockElement) document.exitPointerLock();
    (kaz === bn ? Ses.kazandi : Ses.kaybetti)();
  }

  // ---------- Ana döngü ----------
  let sonT = performance.now();
  function dongu() {
    requestAnimationFrame(dongu);
    const simdi = performance.now(), dt = Math.min(0.05, (simdi - sonT) / 1000); sonT = simdi;
    kare(dt, simdi);
  }
  const masaSesleri = { zarDus: () => Ses.zarDus(), zarTik: () => Ses.tik(), cik: () => Ses.cik() };
  function kare(dt, simdi = performance.now()) {
    if (oyun) {
      if (oyun.faz === 'draft' || oyun.faz === 'bitti') {
        if (oyun.faz === 'draft') { sureCiz(); imlecleriCiz(dt, simdi); }
        Masa.guncelle(dt, masaSesleri);
        const d = oyun.d, siradaki = d && d.faz === 'secim' ? d.sira[d.siraIdx] : -1;
        oyun.k.forEach((v, no) => {
          const kutla = oyun.faz === 'bitti' ? no === oyun.kutlayan : no === siradaki;
          Insan.oynat(v.h, { dt, hiz: 0, blk: false, olu: false, kutla });
          v.h.position.y = oyun.faz === 'bitti' && kutla ? Math.abs(Math.sin(simdi / 160)) * 0.3 : 0;
        });
      } else if (oyun.faz === 'arena' && oyun.arena) {
        benAdim(dt);
        oyun.k.forEach((v, no) => {
          if (no !== benimNo() || !ben) {
            const k = Math.min(1, dt * 14);
            const ox = v.x, oz = v.z;
            v.x += (v.hx - v.x) * k; v.z += (v.hz - v.z) * k;
            let fy = v.hyon - v.yon; fy = Math.atan2(Math.sin(fy), Math.cos(fy)); v.yon += fy * k;
            // ileri mi geri mi yürüyor?
            const vx = (v.x - ox) / dt, vz = (v.z - oz) / dt, h = Math.hypot(vx, vz);
            const ileriMi = Math.sin(v.yon) * vx + Math.cos(v.yon) * vz >= -0.2 * h;
            v.hizYerel = Math.min(1, h / 4) * (ileriMi ? 1 : -1);
            v.blkYerel = !!(v.bayrak & 1);
          }
          v.h.position.set(v.x, 0, v.z); v.h.rotation.y = v.yon;
          Insan.oynat(v.h, { dt, hiz: v.hizYerel || 0, blk: v.blkYerel, olu: v.olu });
          Sahne.etiketCiz(v.et, v.can, v.canMax, v.olu);
          v.et.visible = !v.olu && no !== benimNo();
          efektCiz(v, dt);
        });
        hudCiz();
        kameraArena();
      }
    }
    Sahne.ciz();
  }
  // güçlendirme görünüşü (mor halka, mavi iz, balon)
  function efektCiz(v, dt) {
    const b = v.olu ? 0 : v.bayrak;
    if (!v.efekt) {
      const balon = new THREE.Mesh(new THREE.SphereGeometry(0.95, 16, 12), new THREE.MeshBasicMaterial({ color: 0x8af0ff, transparent: true, opacity: 0.2, depthWrite: false }));
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
  window.addEventListener('resize', () => { if (oyun && (oyun.faz === 'draft' || oyun.faz === 'bitti')) kameraMasa(false); });
  requestAnimationFrame(dongu);

  // testler için: tuslar + kare ile oyuncuyu elle yürütmek mümkün
  return { get oyun() { return oyun; }, get ben() { return ben; }, mesaj, SURUM, kare, tuslar, vurAyarla(s) { sol = !!s; }, esyaSec, zarAtIstek };
})();
