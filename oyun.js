// =============================================================
// Zarena Savaşları - oyuncunun tarafı: ekranlar, bekleme odası, zar ve eşya seçimi,
// fare imleçleri, arenada yürüme / nişan / vuruş / kalkan, HUD.
// Oyunun kuralları evde (motor.js). Kendi yerini oyuncu hesaplar ve eve yollar.
// =============================================================

const Oyun = (() => {
  const SURUM = 13;   // sw.js ONBELLEK numarasıyla aynı tut; oyuncular farklı sürümdeyse uyarı çıkar
  const $ = id => document.getElementById(id);
  const E = Esya;
  Sahne.kur($('sahne'));
  const dokun = matchMedia('(pointer: coarse)').matches;
  if (dokun) document.body.classList.add('dokun');
  $('surumYazi').textContent = 'Sürüm ' + SURUM;
  $('girisSurum').textContent = 'Sürüm ' + SURUM;

  const BOT_AD = ['Demir Bilek', 'Kel Hasan', 'Süpürgeci Sami', 'Tavacı Nuri', 'Dobra Dilek', 'Koca Yusuf', 'Fırtına Fatoş', 'Paspas Polat', 'Çılgın Cemile', 'Gürz Gürkan', 'Terlikli Tülay', 'Hızlı Hüsnü'];
  const kacis = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hex = n => '#' + n.toString(16).padStart(6, '0');
  const NOKTA = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  const zarYuz = v => Array.from({ length: 9 }, (_, i) => `<i${NOKTA[v].includes(i) ? ' class="n"' : ''}></i>`).join('');

  let mod = null, benimId = null;
  const gucVarsayilan = () => ({ mana: true, hiz: true, can: true, koruma: true });
  const OZ = [['tuzak', '🔪 Tuzaklı arena', 'dönen bıçak, ateş ya da buzlu zemin'], ['ozel', '✨ Özel eşyalar', 'buz kılıcı, vampir hançeri, karpuz bombası…'], ['set', '🧩 Eşya setleri', 'aynı setten 3 parça giyen ek güç alır'],
    ['sandik', '🎁 Ödül sandığı', 'arenaya efsane silah / kalkan düşer'], ['seyirci', '👥 Seyirci oyu', 'ölenler oylayıp arenayı karıştırır'], ['takim', '🤝 Takım modu', '🔴 kırmızı - 🔵 mavi, takım arkadaşına vurulmaz'], ['joker', '🃏 Zar jokeri', 'ilk zarda 6 atan bir turda 2 eşya alır']];
  const ozVarsayilan = () => ({ tuzak: true, ozel: true, set: true, sandik: true, seyirci: true, takim: false, joker: true });
  let lobi = { botlar: [], ayar: { hedef: 5, guc: gucVarsayilan(), secimSure: 10, zarSure: 10, kararSure: 10, turSay: 5, kapali: [], oz: ozVarsayilan() } };
  try { const o = JSON.parse(localStorage.getItem('zs.oz') || 'null'); if (o && typeof o === 'object') lobi.ayar.oz = { ...ozVarsayilan(), ...o }; } catch (e) { }
  const TAKIM = ['🔴', '🔵'], TAKIM_AD = ['Kırmızı', 'Mavi'];
  const takimli = () => !!oyun?.ayar?.oz?.takim;
  const tAd = no => (takimli() ? TAKIM[no % 2] + ' ' : '') + oyuncu(no).ad;
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
  Ag.on('oda', ({ kod }) => { benimId = Ag.benimId; $('lobiKod').textContent = kod; ekranGoster('lobi'); lobiYay(); lobiCiz(); mikCiz(); });
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
    $('lobiListe').innerHTML = L.map((p, i) => `<li style="--r:${hex(Insan.RENKLER[i])}"><span>${lobi.ayar.oz?.takim ? TAKIM[i % 2] + ' ' : ''}${p.bot ? '🤖 ' : ''}${p.id === benimId ? '⭐ ' : ''}${kacis(p.ad)}${p.ses ? ' 🎤' : ''}</span><small>${Insan.RENK_AD[i]}</small></li>`).join('');
    $('ayHedef').value = String(lobi.ayar.hedef);
    $('ayHedef').disabled = !yonetici();
    [['ayTur', 'turSay'], ['aySecim', 'secimSure'], ['ayZar', 'zarSure'], ['ayKarar', 'kararSure']].forEach(([el, k]) => { $(el).value = String(lobi.ayar[k] || (k === 'turSay' ? 5 : 10)); $(el).disabled = !yonetici(); });
    document.querySelectorAll('#gucler input').forEach(c => { c.checked = !!lobi.ayar.guc[c.dataset.guc]; c.disabled = !yonetici(); });
    document.querySelectorAll('#ozListe input').forEach(c => { c.checked = !!lobi.ayar.oz?.[c.dataset.oz]; c.disabled = !yonetici(); });
    $('ozHepsiBtn').parentElement.classList.toggle('gizli', !yonetici());
    $('hepsiBtn').classList.toggle('gizli', !yonetici());
    $('botSatir').classList.toggle('gizli', !yonetici());
    $('botEkleBtn').disabled = L.length >= 10; $('botCikarBtn').disabled = !lobi.botlar.length;
    const acik = Object.values(lobi.ayar.guc).filter(Boolean).length;
    $('ayarOzet').textContent = `${L.length} oyuncu · ${lobi.ayar.hedef} puan · ${lobi.ayar.turSay || 5} eşya turu · seçim ${lobi.ayar.secimSure || 10} sn · ${acik ? acik + ' güçlendirme' : 'güçlendirme yok'} · ${OZ.filter(([k]) => lobi.ayar.oz?.[k]).length} ekstra`;
    $('baslaBtn').classList.toggle('gizli', !yonetici());
    { const acikE = E.LISTE.length - (lobi.ayar.kapali || []).filter(id => E.HARITA[id]).length;
      $('esyaAcBtn').innerHTML = `${yonetici() ? '🎒 Eşyaları gör / çıkar' : '🎒 Eşyalara bak'} <small id="esyaSayi">${acikE} / ${E.LISTE.length} eşya açık</small>`;
      if (!$('esyaPencere').classList.contains('gizli')) esyaListeCiz(); }
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
  $('ozListe').innerHTML = OZ.map(([k, ad, acik]) => `<label><input type="checkbox" data-oz="${k}"> <span>${ad} <small>${acik}</small></span></label>`).join('');
  const ozKaydet = () => { try { localStorage.setItem('zs.oz', JSON.stringify(lobi.ayar.oz)); } catch (e) { } };
  document.querySelectorAll('#ozListe input').forEach(c => c.addEventListener('change', () => {
    if (!yonetici()) return;
    lobi.ayar.oz = { ...lobi.ayar.oz, [c.dataset.oz]: c.checked }; ozKaydet(); lobiYay(); lobiCiz();
  }));
  $('ozHepsiBtn').onclick = () => { if (!yonetici()) return; lobi.ayar.oz = Object.fromEntries(OZ.map(([k]) => [k, k !== 'takim' || !!lobi.ayar.oz?.takim])); ozKaydet(); lobiYay(); lobiCiz(); };
  $('ozHicBtn').onclick = () => { if (!yonetici()) return; lobi.ayar.oz = Object.fromEntries(OZ.map(([k]) => [k, false])); ozKaydet(); lobiYay(); lobiCiz(); };
  $('hepsiBtn').onclick = () => { if (!yonetici()) return; lobi.ayar.guc = gucVarsayilan(); lobiYay(); lobiCiz(); };
  $('ayHedef').addEventListener('change', () => { if (!yonetici()) return; lobi.ayar.hedef = +$('ayHedef').value; lobiYay(); lobiCiz(); });
  [['ayTur', 'turSay'], ['aySecim', 'secimSure'], ['ayZar', 'zarSure'], ['ayKarar', 'kararSure']].forEach(([el, k]) => $(el).addEventListener('change', () => { if (!yonetici()) return; lobi.ayar[k] = +$(el).value; try { localStorage.setItem('zs.' + k, $(el).value); } catch (e) { } lobiYay(); lobiCiz(); }));
  try { ['turSay', 'secimSure', 'zarSure', 'kararSure'].forEach(k => { const v = +localStorage.getItem('zs.' + k); if (v) lobi.ayar[k] = v; }); } catch (e) { }
  // ---------- Eşya seçme penceresi ----------
  function esyaIpucu(x) {
    const yildiz = '★'.repeat(Math.max(1, Math.round(x.p / 2))) + '☆'.repeat(5 - Math.max(1, Math.round(x.p / 2)));
    const ek = x.yuva === 'silah' && x.itme >= 10 ? ['🌀 Çok uzağa fırlatır'] : [];
    return `<b>${x.emoji} ${kacis(x.ad)}</b>\n${E.YUVA_AD[x.yuva]} · ${yildiz} (${x.p}/10)\n` + [...ozellikYazi(x), ...ek].join('\n');
  }
  function kapaliKaydet() { try { localStorage.setItem('zs.kapali', JSON.stringify(lobi.ayar.kapali || [])); } catch (e) { } }
  function esyaListeCiz() {
    const kapali = new Set(lobi.ayar.kapali || []), yon = yonetici();
    $('esyaPencere').classList.toggle('izle', !yon);
    $('esyaPencereYazi').textContent = (yon ? 'İstemediğin eşyaya tıkla: üstü çizilir ve masaya hiç çıkmaz. Tekrar tıklarsan geri gelir. Fareyle üstüne gel: ne işe yaradığını gör.' : 'Hangi eşyaların açık olduğunu oda sahibi seçer. Fareyle üstüne gel: ne işe yaradığını gör.')
      + (oyun && !oyun.bitti ? ' ⏭️ Oyun sürerken: masadaki eşyalar değişmez, SONRAKİ turdan itibaren geçerli olur.' + uygulamaNotu : '');
    const acik = E.LISTE.filter(x => !kapali.has(x.id)).length, oyuncuS = Math.max(2, herkes().length);
    $('esyaPencereYazi').textContent += !acik ? ' ⚠️ Hiç eşya açık değil: oyunda HEPSİ kullanılır.' : acik < oyuncuS ? ` ⚠️ Çok az eşya açık (${acik}): aynı eşyalar tekrar tekrar çıkar.` : '';
    $('esyaListe').innerHTML = E.YUVALAR.map(y => {
      const L = E.LISTE.filter(x => x.yuva === y).sort((a, b) => a.p - b.p);
      const ac = L.filter(x => !kapali.has(x.id)).length;
      return `<div class="yuvaGrup"><h3><span>${E.YUVA_EMOJI[y]} ${E.YUVA_AD[y]} <small>(${ac}/${L.length})</small></span>${yon ? `<button class="kucuk" data-yuva="${y}">${ac === L.length ? '⬜ Hiçbiri' : '✅ Hepsi'}</button>` : ''}</h3><div class="esyaCipler">`
        + L.map(x => `<button class="esyaCip${kapali.has(x.id) ? ' kapali' : ''}${x.p <= 4 ? ' kotu' : ''}" data-id="${x.id}" data-ipucu="${kacis(esyaIpucu(x))}">${x.emoji} ${kacis(x.ad)}<small>★${x.p}</small></button>`).join('')
        + '</div></div>';
    }).join('');
  }
  $('esyaAcBtn').onclick = () => { $('esyaPencere').classList.remove('gizli'); esyaListeCiz(); };
  $('esyaKapatBtn').onclick = () => { $('esyaPencere').classList.add('gizli'); ipucuGizle(); };
  $('esyaListe').addEventListener('click', e => {
    if (!yonetici()) return;
    const kapali = new Set(lobi.ayar.kapali || []);
    const cip = e.target.closest('.esyaCip'), yb = e.target.closest('button[data-yuva]');
    if (cip) { const id = cip.dataset.id; kapali.has(id) ? kapali.delete(id) : kapali.add(id); }
    else if (yb) { const L = E.LISTE.filter(x => x.yuva === yb.dataset.yuva), hepsiAcik = L.every(x => !kapali.has(x.id)); L.forEach(x => hepsiAcik ? kapali.add(x.id) : kapali.delete(x.id)); }
    else return;
    lobi.ayar.kapali = [...kapali]; kapaliKaydet(); oyundaUygula(); lobiYay(); lobiCiz(); esyaListeCiz();
  });
  document.querySelectorAll('.esyaDugmeler button').forEach(b => b.onclick = () => {
    if (!yonetici()) return;
    const k = b.dataset.sec;
    lobi.ayar.kapali = E.LISTE.filter(x => k === 'hic' || (k === 'kotu' && x.p > 4) || (k === 'iyi' && x.p < 5)).map(x => x.id);
    kapaliKaydet(); oyundaUygula(); lobiYay(); lobiCiz(); esyaListeCiz();
  });
  // Oyun sürerken: oda sahibinin motoru bir sonraki eşya seçiminde bunu kullanır
  function oyundaUygula() {
    if (!(oyun && yonetici() && Motor.M)) return;
    const n = Motor.kapaliGuncelle((lobi.ayar.kapali || []).slice());
    uygulamaNotu = n ? ` ✅ Kalan ${n} turun eşyaları yeniden hazırlandı.` : ' ✅ Arenadan sonraki eşya seçiminde geçerli olacak.';
  }
  let uygulamaNotu = '';
  $('oyunEsyaBtn').onclick = () => { uygulamaNotu = ''; $('esyaPencere').classList.remove('gizli'); esyaListeCiz(); };
  try { const k = JSON.parse(localStorage.getItem('zs.kapali') || '[]'); if (Array.isArray(k)) lobi.ayar.kapali = k.filter(id => E.HARITA[id]); } catch (e) { }

  // ---------- Eşya açıklama kutusu (fareyle üstüne gelince) ----------
  const ipK = $('ipucuKutu');
  let ipHedef = null, ipZaman = 0;
  function ipucuGoster(el, x, y) {
    ipHedef = el; ipK.innerHTML = el.dataset.ipucu; ipK.classList.remove('gizli');
    const w = ipK.offsetWidth, h = ipK.offsetHeight;
    let l = x + 14, t = y - h - 12;
    if (l + w > innerWidth - 6) l = Math.max(6, x - w - 14);
    if (t < 6) t = Math.min(innerHeight - h - 6, y + 18);
    ipK.style.left = l + 'px'; ipK.style.top = t + 'px';
  }
  function ipucuGizle() { ipHedef = null; ipK.classList.add('gizli'); }
  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest?.('[data-ipucu]');
    if (el) ipucuGoster(el, e.clientX, e.clientY); else if (ipHedef) ipucuGizle();
  }, { passive: true });
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    const el = e.target.closest?.('[data-ipucu]');
    if (el && !el.classList.contains('esyaCip')) { ipucuGoster(el, e.clientX, e.clientY); clearTimeout(ipZaman); ipZaman = setTimeout(ipucuGizle, 2600); }
    else if (ipHedef) ipucuGizle();
  }, { passive: true });

  $('kodKopyalaBtn').onclick = () => { navigator.clipboard?.writeText(Ag.kod).then(() => { $('lobiDurum').textContent = 'Kod kopyalandı.'; }).catch(() => {}); };
  $('lobiCikBtn').onclick = () => menuyeDon('');
  $('lobiMikBtn').onclick = mikDegistir;
  $('baslaBtn').onclick = baslat;
  function baslat() {
    if (!yonetici()) return;
    const L = herkes();
    if (L.length < 2) { if (oyun) { oyunTemizle(); ekranGoster('lobi'); lobiCiz(); } $('lobiDurum').textContent = 'En az 2 oyuncu gerekli: bot ekle.'; return; }
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
    mikCiz();
  }
  $('lobiyeBtn').onclick = () => {
    if (mod === 'ev') { Motor.durdur(); Ag.yayinla({ tip: 'lobiyeDon' }); }
    else if (mod === 'tek') { Motor.durdur(); oyunTemizle(); ekranGoster('lobi'); lobiCiz(); }
    else { oyunTemizle(); ekranGoster('lobi'); lobiCiz(); }
  };
  $('tekrarBtn').onclick = () => { if (yonetici()) baslat(); };
  // ---------- Oyun içi menü ----------
  function menuAc() {
    if (!oyun) return;
    if (document.pointerLockElement) document.exitPointerLock();
    const ev = mod === 'ev' || mod === 'tek';
    $('menuLobiBtn').classList.toggle('gizli', !ev);
    $('menuYazi').textContent = mod === 'ev' ? 'Bekleme odasına götürürsen oyun herkes için biter, oda açık kalır. Ana sayfaya dönersen oda kapanır.'
      : mod === 'misafir' || mod === 'katil' ? 'Ana sayfaya dönersen oyundan çıkarsın, yerine bot oynar.' : 'Bekleme odasında ayarları değiştirip yeniden başlatabilirsin.';
    $('menuCikBtn').textContent = mod === 'ev' ? '🚪 Ana sayfaya dön (odayı kapat)' : '🚪 Ana sayfaya dön (oyundan çık)';
    $('oyunMenu').classList.remove('gizli');
  }
  const menuKapat = () => $('oyunMenu').classList.add('gizli');
  $('cikBtn').onclick = menuAc;
  $('draftMenuBtn').onclick = menuAc;
  $('menuDevamBtn').onclick = menuKapat;
  $('menuLobiBtn').onclick = () => { menuKapat(); $('lobiyeBtn').onclick(); };
  $('menuCikBtn').onclick = () => { menuKapat(); menuyeDon(''); };
  $('oyunMenu').addEventListener('click', e => { if (e.target.id === 'oyunMenu') menuKapat(); });
  addEventListener('keydown', e => { if (e.code === 'Escape' && oyun) { $('oyunMenu').classList.contains('gizli') ? menuAc() : menuKapat(); } });
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
    E.setAc(!!m.ayar.oz?.set);
    m.oyuncular.forEach(p => {
      const h = Insan.yap(p.renk, p.ten);
      const et = Sahne.etiketYap((m.ayar.oz?.takim ? TAKIM[p.no % 2] + ' ' : '') + p.ad, hex(Insan.RENKLER[p.renk]));
      h.add(et);
      Sahne.scene.add(h);
      oyun.k.set(p.no, { h, et, x: 0, z: 0, yon: 0, hx: 0, hz: 0, hyon: 0, can: 1, canMax: 1, bayrak: 0, kusam: {}, efekt: null });
    });
    $('akis').innerHTML = '';
    mikCiz(); Ag.sesGuncelle();
  }
  function oyunTemizle() {
    $('oyunMenu').classList.add('gizli');
    if (oyun) { oyun.k.forEach(v => Sahne.at(v.h)); yerdeCiz([]); ekstraTemizle(); $('oyPanel').classList.add('gizli'); Sahne.gucleriTemizle(); Sahne.mermileriCiz([]); clearInterval(oyun.turSayac); }
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
        lobi = { botlar: m.botlar || [], ayar: { secimSure: 10, zarSure: 10, kararSure: 10, turSay: 5, kapali: [], ...m.ayar, guc: m.ayar.guc || gucVarsayilan(), oz: { ...ozVarsayilan(), ...(m.ayar.oz || {}) } } };
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
    ekstraTemizle(); $('oyPanel').classList.add('gizli');
    yerdeCiz([]); $('alYazi').classList.add('gizli'); $('alBtn').classList.add('gizli'); $('alYazi').dataset.y = '';
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
    if (m.faz !== 'bekle' && m.faz !== 'kararBekle' && anahtar !== oyun.turAnahtar) {   // yeni tur: masa boşalır
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
    // 🃏 Joker
    if (m.sonZar && m.sonZar.v === 6 && m.sonZar.a === 0 && oyun.ayar.oz?.joker && oyun.jokerGoruldu !== `${anahtar}.${m.sonZar.no}`) {
      oyun.jokerGoruldu = `${anahtar}.${m.sonZar.no}`;
      setTimeout(() => banner(`🃏 ${kacisYok(oyuncu(m.sonZar.no).ad)} 6 attı!`, 'Joker kazandı: bir turda 2 eşya alabilir'), 700);
    }
    if (m.ekstra != null && onceki?.ekstra !== m.ekstra) { banner('🃏 JOKER!', `${kacisYok(oyuncu(m.ekstra).ad)} bu tur 2 eşya alıyor`); Ses.sira(); }
    // Sıra bende mi?
    const siradaki = m.faz === 'secim' ? m.sira[m.siraIdx] : -1;
    if (siradaki === benimNo() && oyun.sonSiraSes !== `${anahtar}.${m.siraIdx}`) { oyun.sonSiraSes = `${anahtar}.${m.siraIdx}`; Ses.sira(); setTimeout(() => banner('👉 SIRA SENDE!', 'Masadan bir eşyaya tıkla'), 900); }
    if (m.faz === 'bekle' && onceki?.faz !== 'bekle' && m.sonraki === 'arena') setTimeout(() => { if (oyun?.d?.faz === 'bekle') banner('⚔️ HERKES KUŞANDI!', 'Arenaya çıkılıyor…'); }, 900);
    if (m.faz === 'kararBekle' && onceki?.faz !== 'kararBekle') banner('🤔 KARARLAR BEKLENİYOR', `Arena ${m.sureTop} saniye bekliyor`);
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
      <div class="kkNot">Arena başlamadan önce seçebilirsin (arena ${oyun.ayar.kararSure || 10} sn bekler). Seçmezsen iyi olan (${iyisi === 'yeni' ? x.emoji + ' ' + kacis(x.ad) : eski.emoji + ' ' + kacis(eski.ad)}) kendiliğinden seçilir.${liste.length > 1 ? ` · ${liste.length - 1} karar daha bekliyor` : ''}</div>`;
    kutu.classList.remove('gizli');
    $('kkGiyBtn').onclick = () => kararVer(id, true);
    $('kkKoruBtn').onclick = () => kararVer(id, false);
    Ses.sira();
  }
  function kararVer(id, giy) {
    const kutu = $('kararKutu'); kutu.classList.add('gizli'); kutu.dataset.id = '';
    eve({ tip: 'karar', id, giy });
    oyun.sonKarar = { id, giy };
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
    else if (d.faz === 'kararBekle') {
      const kim = oyun.oyuncular.filter(p => (d.kararlar?.[p.no] || []).length).map(p => p.no);
      t = kim.includes(bn) ? '🤔 <b style="--r:#ffd36a">Kararını ver!</b> Arena seni bekliyor' : `🤔 Karar bekleniyor: ${kim.map(no => `<b style="--r:${renkCss(no)}">${kacis(oyuncu(no).ad)}</b>`).join(', ')}`;
    }
    $('draftDurum').innerHTML = t;
    $('draftBaslik').textContent = `🎲 Eşya seçimi · Tur ${Math.min(d.tur + 1, d.turSay)} / ${d.turSay}`;
    const zarBende = d.faz === 'zar' && d.bekleyen.includes(bn);
    $('zarAtBtn').classList.toggle('gizli', !zarBende);
    const kalanEsya = d.esyalar ? d.esyalar.filter((_, i) => d.alinan[i] === undefined).length : 0;
    $('jokerBtn').classList.toggle('gizli', !(d.faz === 'secim' && d.sira?.[d.siraIdx] === bn && (d.joker?.[bn] || 0) > 0 && d.ekstra == null && kalanEsya >= 2 && oyun.esyaCikti));
  }
  function zarAtIstek() {
    const d = oyun?.d;
    if (!d || d.faz !== 'zar' || !d.bekleyen.includes(benimNo())) return;
    $('zarAtBtn').classList.add('gizli');
    eve({ tip: 'zarAt' });
  }
  $('zarAtBtn').onclick = zarAtIstek;
  $('jokerBtn').onclick = () => { $('jokerBtn').classList.add('gizli'); eve({ tip: 'joker' }); };
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
      const ust = E.YUVALAR.map(y => kusam[y] ? `<span data-ipucu="${kacis(esyaIpucu(E.al(kusam[y])))}">${E.al(kusam[y]).emoji}</span>` : '').join('');
      const dusunuyor = (d.kararlar?.[no] || []).length && !oyun.giyinecek?.has(no);
      return `<div class="spSatir${no === siradaki ? ' siradaki' : ''}${no === bn ? ' ben' : ''}" style="--r:${renkCss(no)}">
        <span class="spNo">${siraNo[no] || ''}</span><div class="spOrta"><div class="spAd">${kacis(tAd(no))}${no === bn ? ' ⭐' : ''}${d.joker?.[no] ? ' ' + '🃏'.repeat(d.joker[no]) : ''}${bekliyor ? ' <i>atıyor…</i>' : ''}</div>
        <div class="spAlt">${al ? `<b>${al.emoji} ${kacis(al.ad)}</b>${dusunuyor ? ' <i class="dus">🤔 giysin mi?</i>' : ''}` : no === siradaki ? '<b class="dusun">seçiyor…</b>' : `<span class="ust">${ust}</span>`}</div></div><div class="spZar">${zarHtml}</div></div>`;
    }).join('');
  }
  function kusamimCiz() {
    const no = benimNo(); if (no < 0 || !oyun?.d) { $('kusamim').innerHTML = ''; return; }
    const k = oyun.giyinecek?.has(no) ? (oyun.oncekiKusam || {}) : (oyun.d.kusam[no] || {});
    oyun.oncekiKusam = k;
    const st = E.statlar(k);
    requestAnimationFrame(() => { const h = $('kusamim').offsetHeight; if (h) document.documentElement.style.setProperty('--altPay', (h + 14) + 'px'); });
    const setYazi = (st.setler || []).map(x => `${x.emoji} ${x.ad} seti: ${x.yazi}`).join('\n');
    $('kusamim').innerHTML = E.YUVALAR.map(y => { const x = E.al(k[y]); return `<div class="yuvaKutu${x ? '' : ' bos'}"${x ? ` data-ipucu="${kacis(esyaIpucu(x))}"` : ''}><b>${x ? x.emoji : E.YUVA_EMOJI[y]}</b>${x ? kacis(x.ad) : E.YUVA_AD[y] + ' boş'}</div>`; }).join('')
      + `<div class="statYazi" data-ipucu="${kacis(`<b>📊 Toplam gücün</b>\n❤️ ${st.canMax} can (donla ${E.CAN_TEMEL})\n🪨 %${Math.round(st.zirh * 100)} zırh: gelen hasarı azaltır\n💨 ${st.hiz >= 0 ? '+' : ''}${Math.round(st.hiz * 100)}% hız\n${st.silah.emoji} ${kacis(st.silah.ad)}: ${st.silah.hasar} hasar\n🛡️ Blok %${Math.round(st.blok * 100)}${st.kalkan ? '' : ' (kalkansız, kollarla)'}${setYazi ? '\n🧩 ' + setYazi : ''}`)}">${(st.setler || []).map(x => x.emoji).join('')}❤️ ${st.canMax} · 🪨 %${Math.round(st.zirh * 100)} · 💨 ${st.hiz >= 0 ? '+' : ''}${Math.round(st.hiz * 100)}% · ${st.silah.emoji} ${st.silah.hasar}</div>`;
  }
  function ozellikYazi(x) {
    const p = [];
    if (x.yuva === 'silah') { p.push(`💥 Hasar ${x.hasar}`); p.push(x.tur === 'atis' ? `🎯 Uzaktan ${x.menzil} m` : `📏 Yakın ${x.menzil} m`); p.push(`⏱️ ${x.bekleme} sn`); }
    if (x.yuva === 'kalkan') p.push(`🛡️ Blok %${Math.round(x.blok * 100)}${x.yansit ? ' · ↩️ mermiyi geri yollar' : ''}`);
    if (x.can) p.push(`❤️ +${x.can} can`);
    if (x.zirh) p.push(`🪨 %${Math.round(x.zirh * 100)} zırh`);
    if (x.hiz) p.push(`${x.hiz > 0 ? '💨 +' : '🐌 -'}${Math.round(Math.abs(x.hiz) * 100)}% hız`);
    if (x.ozel) p.push('✨ ' + x.ozelYazi);
    if (setAcikMi()) E.setleriBul(x.id).forEach(st => p.push(`🧩 ${st.emoji} ${st.ad} seti: 3 parça = ${st.yazi}`));
    return p;
  }
  const setAcikMi = () => (oyun ? !!oyun.ayar?.oz?.set : !!lobi.ayar.oz?.set);
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
      ${setAcikMi() ? E.setDurum({ ...kusam, [x.yuva]: x.id }).filter(d => E.setleriBul(x.id).includes(d.s)).map(d => `<div class="ebEski setYazi">🧩 Alırsan ${d.s.emoji} ${d.s.ad} seti: ${d.n}/3${d.n >= 3 ? ' ✅ ' + d.s.yazi : ''}</div>`).join('') : ''}
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
    const top = d.sureTop || 0;
    $('draftSureDolu').style.width = top ? (kalan / top * 100) + '%' : '0%';
    const benimIs = (d.faz === 'secim' && d.sira[d.siraIdx] === benimNo()) || (d.faz === 'zar' && d.bekleyen.includes(benimNo())) || (d.faz === 'kararBekle' && (d.kararlar?.[benimNo()] || []).length);
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
  // Üstte: sıradaki oyuncu hangi eşyaya bakıyor
  function seciyorCiz(simdi) {
    const d = oyun.d, el = $('seciyorYazi');
    const s = d && d.faz === 'secim' && d.sira ? d.sira[d.siraIdx] : -1;
    let yazi = '';
    if (s >= 0 && oyun.esyaCikti) {
      const bn = benimNo(), ad = s === bn ? 'Sen' : kacis(oyuncu(s).ad);
      let i = -1;
      if (s === bn) i = oyun.uzerinde ?? -1;
      else {
        const c = oyun.imlec.get(s);
        if (c && simdi - c.t < 2500) {
          let en = 0.75;
          d.esyalar.forEach((id, j) => { if (d.alinan[j] !== undefined) return; const y = Motor.esyaYeri(j, d.esyalar.length), u = Math.hypot(y.x - c.x, y.z - c.z); if (u < en) { en = u; i = j; } });
        }
      }
      const x = i >= 0 && d.alinan[i] === undefined ? E.al(d.esyalar[i]) : null;
      yazi = `<span style="--r:${renkCss(s)}">🎯 <b>${ad}</b> ${s === bn ? 'seçiyorsun' : 'seçiyor'}` + (x ? ` · 👀 <span class="esyaAd">${x.emoji} ${kacis(x.ad)}</span> <small>★${x.p}</small> ${s === bn ? 'eşyasına bakıyorsun' : 'eşyasına bakıyor'}` : ' <small>…düşünüyor</small>') + '</span>';
      el.style.setProperty('--r', renkCss(s));
    }
    if (el.dataset.y !== yazi) { el.dataset.y = yazi; el.innerHTML = yazi; el.classList.toggle('gizli', !yazi); }
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
    { const k = oyun.sonKarar, bk = m.oyuncular[benimNo()]?.kusam; if (k && bk && k.giy !== (bk[E.al(k.id).yuva] === k.id)) setTimeout(() => akis('⏱️ Karar süresi dolmuştu: iyi olan eşya giyildi'), 300); oyun.sonKarar = null; }
    // dokunmatik/fare durumları sıfırlansın (önceki turdan takılı kalmasın)
    Object.assign(joy, { aktif: false, id: null, x: 0, y: 0 }); topuz.style.transform = ''; bakis.id = null;
    dokunVur.basili = dokunKalkan.basili = false; $('vurBtn').classList.remove('basili'); $('kalkanBtn').classList.remove('basili');
    sol = sag = tekVur = false; fare.basili = false; tuslar.clear();
    yerdeCiz([]);
    oyun.faz = 'arena'; oyun.arena = { R: m.R, zr: m.R, f: 'geri', s: 3, sutunlar: m.sutunlar, sonSayi: -1, tuzak: m.tuzak || null, tz: 0 };
    oyun.turBasi = oyun.puan.slice();
    $('oyPanel').classList.add('gizli');
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
    buyukYazi('HAZIR OL!', ben ? `${ben.st.silah.emoji} ${ben.st.silah.ad} · ❤️ ${ben.st.canMax}${(ben.st.setler || []).map(x => ' · ' + x.emoji + ' ' + x.ad + ' seti').join('')}` : '', 1200);
    ekstraKur(m.tuzak, m.R);
    if (m.tuzak) { const [b, a] = TUZAK_AD[m.tuzak.tur]; setTimeout(() => { if (oyun?.faz === 'arena') { buyukYazi(b, a, 1600); akis(`${b} ${a}`); } }, 1400); }
    if (takimli() && bn >= 0) akis(`🤝 Takımın: ${TAKIM[bn % 2]} ${TAKIM_AD[bn % 2]}. Takım arkadaşına vurulmaz.`);
    Sahne.cosku(1.5);
  }
  // ---------- Ekstra özellikler: tuzak, ödül sandığı, meteor, seyirci oyu ----------
  const TUZAK_AD = { bicak: ['🔪 DÖNEN BIÇAKLAR!', 'Ortadaki bıçaklara yakalanma'], ates: ['🔥 ATEŞ FIŞKIRANLAR!', 'Turuncu yanan yerlerden kaç'], buz: ['🧊 BUZLU ARENA!', 'Zemin kaygan, kayarak yürürsün'] };
  const OY_AD = { meteor: '☄️ Meteor yağmuru', iksir: '❤️ Can iksiri yağmuru', yavas: '🐌 Herkes yavaşlasın', mana: '🔮 Herkese güçlü vuruş' };
  let ekstra = null;
  function ekstraTemizle() { if (ekstra) { Sahne.at(ekstra.g); ekstra = null; } }
  function ekstraKur(tz, R) {
    ekstraTemizle();
    const g = new THREE.Group(); Sahne.scene.add(g);
    ekstra = { g, tz, bicak: null, ventler: [], sandik: null, meteor: new Map() };
    if (!tz) return;
    if (tz.tur === 'bicak') {
      const kol = new THREE.Group();
      const gov = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.0, 16), new THREE.MeshStandardMaterial({ color: 0x4a4f56, metalness: 0.6, roughness: 0.4 }));
      gov.position.y = 0.5; kol.add(gov);
      const bm = new THREE.MeshStandardMaterial({ color: 0xd8dee6, metalness: 0.85, roughness: 0.2 }), km = new THREE.MeshStandardMaterial({ color: 0xb02a1a });
      [0, Math.PI].forEach(a => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, tz.L - 0.4), bm);
        b.position.set(Math.sin(a) * (tz.L / 2 + 0.2), 0.75, Math.cos(a) * (tz.L / 2 + 0.2)); b.rotation.y = a; kol.add(b);
        for (let i = 1; i <= 4; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), km); const r = 0.4 + (tz.L - 0.4) * i / 4.5; u.position.set(Math.sin(a) * r, 0.75, Math.cos(a) * r); u.rotation.y = a; kol.add(u); }
      });
      kol.traverse(o => { if (o.isMesh) o.castShadow = true; });
      g.add(kol); ekstra.bicak = kol;
    } else if (tz.tur === 'ates') {
      const izgara = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9 }), uyari = new THREE.MeshBasicMaterial({ color: 0xff8a1a, transparent: true, opacity: 0.0, depthWrite: false });
      tz.ventler.forEach(v => {
        const vg = new THREE.Group(); vg.position.set(v.x, 0, v.z);
        const d = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.08, 18), izgara); d.position.y = 0.04; vg.add(d);
        const h = new THREE.Mesh(new THREE.RingGeometry(0.8, Motor.ATES_R + 0.1, 28), uyari.clone()); h.rotation.x = -Math.PI / 2; h.position.y = 0.06; vg.add(h);
        const ates = new THREE.Mesh(new THREE.ConeGeometry(Motor.ATES_R, 2.6, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffa21a, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide }));
        ates.position.y = 1.3; ates.visible = false; vg.add(ates);
        g.add(vg); ekstra.ventler.push({ v, h, ates, iz: 0 });
      });
    } else if (tz.tur === 'buz') {
      const b = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2, depthWrite: false }));
      b.rotation.x = -Math.PI / 2; b.position.y = 0.025; b.receiveShadow = true; g.add(b);
    }
  }
  function sandikCiz(sd) {
    if (!ekstra) return;
    if (ekstra.sandik) { Sahne.at(ekstra.sandik); ekstra.sandik = null; }
    if (!sd) return;
    const [, x, z] = sd, s = new THREE.Group();
    const tahta = new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.8 }), altin = new THREE.MeshStandardMaterial({ color: 0xffcc22, metalness: 0.8, roughness: 0.3 });
    const gov = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), tahta); gov.position.y = 0.25; s.add(gov);
    const kapak = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI), tahta); kapak.rotation.z = Math.PI / 2; kapak.position.y = 0.5; s.add(kapak);
    [-0.3, 0.3].forEach(a => { const k = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.82, 0.62), altin); k.position.set(a, 0.42, 0); s.add(k); });
    const kilit = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.05), altin); kilit.position.set(0, 0.48, 0.31); s.add(kilit);
    const halka = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 28), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.7, depthWrite: false })); halka.rotation.x = -Math.PI / 2; halka.position.y = 0.04; s.add(halka);
    const sp = Sahne.emojiSprite('🎁', 0.7); sp.position.y = 1.4; s.add(sp);
    s.traverse(o => { if (o.isMesh) o.castShadow = true; });
    s.position.set(x, 0, z); s.userData = { sp, kutu: [gov, kapak] };
    ekstra.g.add(s); ekstra.sandik = s;
    Sahne.partikul(x, 0.6, z, 0xffd36a, 20, 4);
  }
  function meteorCiz(liste) {
    if (!ekstra) return;
    const var_ = new Set();
    liste.forEach(([id, x, z, t]) => {
      var_.add(id);
      const m = ekstra.meteor.get(id);
      if (m) { m.t = t; return; }
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const h = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.8, 30), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.8, depthWrite: false })); h.rotation.x = -Math.PI / 2; h.position.y = 0.05; g.add(h);
      const ic = new THREE.Mesh(new THREE.CircleGeometry(1.5, 30), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.15, depthWrite: false })); ic.rotation.x = -Math.PI / 2; ic.position.y = 0.04; g.add(ic);
      const tas = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45), new THREE.MeshStandardMaterial({ color: 0x5a3a1a, emissive: 0xff5a1a, emissiveIntensity: 0.6 })); tas.position.y = 12; g.add(tas);
      ekstra.g.add(g); ekstra.meteor.set(id, { g, tas, h, t });
    });
    ekstra.meteor.forEach((m, id) => { if (!var_.has(id)) { Sahne.at(m.g); ekstra.meteor.delete(id); } });
  }
  function ekstraAnim(dt, simdi) {
    const A = oyun.arena; if (!ekstra || !A) return;
    if (A.f === 'savas') A.tz += dt;
    const tz = ekstra.tz;
    if (ekstra.bicak) ekstra.bicak.rotation.y = A.tz * tz.hiz;
    ekstra.ventler.forEach(o => {
      const d = A.f === 'savas' ? Motor.atesDurum(o.v, A.tz) : 0;
      o.h.material.opacity = d === 1 ? 0.35 + Math.abs(Math.sin(simdi / 90)) * 0.5 : d === 2 ? 0.9 : 0;
      o.ates.visible = d === 2;
      if (d === 2) { o.ates.scale.set(1 + Math.sin(simdi / 50) * 0.08, 1 + Math.sin(simdi / 70) * 0.15, 1); o.iz += dt; if (o.iz > 0.1) { o.iz = 0; Sahne.partikul(o.v.x, 0.4, o.v.z, 0xff7a1a, 2, 2.5, 0.6); } }
    });
    if (ekstra.sandik) { const u = ekstra.sandik.userData; u.sp.position.y = 1.4 + Math.sin(simdi / 250) * 0.1; ekstra.sandik.rotation.y += dt * 0.6; }
    ekstra.meteor.forEach(m => { m.t -= dt; m.tas.position.y = Math.max(0.4, m.t * 9); m.tas.rotation.x += dt * 4; m.h.material.opacity = 0.5 + Math.abs(Math.sin(simdi / 100)) * 0.4; });
    if (oyun.oy) { const k = Math.max(0, Math.ceil((oyun.oy.bitis - simdi) / 1000)); $('oySure').textContent = `⏱️ ${k} sn · Ölenler oylar, en çok oy alan olur`; }
  }
  function oyBasla(sec, sure) {
    oyun.oy = { sec, bitis: performance.now() + sure * 1000, verdim: -1 };
    const bn = benimNo(), oylayabilir = bn >= 0 && oyun.k.get(bn)?.olu;
    if (!oylayabilir) { akis('👥 Seyirciler (ölenler) oyluyor: ' + sec.map(k => OY_AD[k]).join(' · ')); return; }
    oyPanelAc();
  }
  function oyPanelAc() {
    const sec = oyun?.oy?.sec; if (!sec) return;
    $('oyDugmeler').innerHTML = sec.map((k, i) => `<button data-i="${i}">${OY_AD[k]}<i>0 oy</i></button>`).join('');
    $('oyDugmeler').querySelectorAll('button').forEach(b => b.onclick = () => {
      const i = +b.dataset.i; oyun.oy && (oyun.oy.verdim = i);
      $('oyDugmeler').querySelectorAll('button').forEach(x => x.classList.toggle('secili', x === b));
      eve({ tip: 'oy', i });
    });
    $('oyPanel').classList.remove('gizli');
    if (document.pointerLockElement) document.exitPointerLock();
    Ses.sira();
  }
  function oySay(say) { $('oyDugmeler').querySelectorAll('button').forEach((b, i) => { const x = b.querySelector('i'); if (x) x.textContent = `${say[i] || 0} oy`; }); }

  // ---------- Yerdeki silah / kalkanlar ----------
  const yerdeMap = new Map();
  function yerdeCiz(liste) {
    const var_ = new Set();
    liste.forEach(([id, x, z, esya]) => {
      var_.add(id);
      if (yerdeMap.has(id)) return;
      const e = E.al(esya); if (!e) return;
      const g = new THREE.Group();
      const model = e.yuva === 'silah' ? Insan.silahYap(e) : Insan.kalkanYap(e);
      const kutu = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
      model.scale.setScalar(Math.min(1, 1.0 / Math.max(0.3, kutu.x, kutu.y, kutu.z)));
      if (e.yuva === 'silah') { model.rotation.z = Math.PI / 2; model.position.set(0.35, 0.12, 0); }
      else { model.rotation.x = Math.PI; model.position.y = 0.02; }
      const don = new THREE.Group(); don.add(model); g.add(don);
      const halka = new THREE.Mesh(Sahne.paylas('yerHalka', () => new THREE.RingGeometry(0.5, 0.62, 28)), Sahne.paylas('yerHalkaMat', () => new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.75, depthWrite: false })));
      halka.rotation.x = -Math.PI / 2; halka.position.y = 0.03; g.add(halka);
      const sp = Sahne.emojiSprite(e.emoji, 0.6); sp.position.y = 1.05; g.add(sp);
      g.position.set(x, 0, z);
      g.userData = { don, sp, faz: Math.random() * 6, esya, x, z };
      g.traverse(o => { if (o.isMesh) o.castShadow = true; });
      Sahne.scene.add(g); yerdeMap.set(id, g);
    });
    yerdeMap.forEach((g, id) => { if (!var_.has(id)) { Sahne.at(g); yerdeMap.delete(id); } });
  }
  function yerdeAnim(dt, simdi) {
    yerdeMap.forEach(g => { g.userData.don.rotation.y += dt * 0.8; g.userData.sp.position.y = 1.05 + Math.sin(simdi / 300 + g.userData.faz) * 0.08; });
    // Yakında alınabilecek eşya varsa yaz / düğme göster
    let yazi = '';
    if (ben && !ben.olu && oyun.arena?.f === 'savas') {
      let en = null, enD = Motor.TAKAS_MESAFE;
      yerdeMap.forEach(g => { const d = Math.hypot(g.userData.x - ben.x, g.userData.z - ben.z); if (d < enD) { enD = d; en = g; } });
      if (en) {
        const x = E.al(en.userData.esya), eskiId = oyun.k.get(benimNo())?.kusam?.[x.yuva], eski = E.al(eskiId);
        const ok = x.p > (eski ? eski.p : 0) ? ' 👍' : x.p < (eski ? eski.p : 0) ? ' 👎' : '';
        yazi = `${dokun ? '' : '<kbd>E</kbd> '}${x.emoji} ${kacis(x.ad)} <i>★${x.p}</i> al${ok}` + (eski ? `<small>Elindeki ${eski.emoji} ${kacis(eski.ad)} ★${eski.p} yere düşer</small>` : '');
      }
    }
    const el = $('alYazi');
    if (el.dataset.y !== yazi) { el.dataset.y = yazi; el.innerHTML = yazi; el.classList.toggle('gizli', !yazi); $('alBtn').classList.toggle('gizli', !yazi || !dokun); }
  }
  function yerdenAlIstek() { if (oyun?.faz === 'arena' && ben && !ben.olu && $('alYazi').dataset.y) eve({ tip: 'al' }); }
  $('alBtn').addEventListener('touchstart', e => { e.preventDefault(); yerdenAlIstek(); }, { passive: false });
  $('alBtn').addEventListener('click', yerdenAlIstek);

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
    if (m.y) yerdeCiz(m.y);
    if (m.sd !== undefined) sandikCiz(m.sd);
    if (m.mt) meteorCiz(m.mt);
    A.tz = m.f === 'savas' ? m.s : 0;
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
        if (katil >= 0) { if (takimli()) oyun.puan.forEach((_, n) => { if (n % 2 === katil % 2) oyun.puan[n]++; }); else oyun.puan[katil]++; akis(`⚔️ <b style="color:${renkCss(katil)}">${kacis(oyuncu(katil).ad)}</b> → <b style="color:${renkCss(no)}">${kacis(oyuncu(no).ad)}</b> yere serildi! (+1)`, katil === bn ? 'iyi' : no === bn ? 'kotu' : ''); }
        else akis(`💀 <b style="color:${renkCss(no)}">${kacis(oyuncu(no).ad)}</b> alanın dışında yandı`, no === bn ? 'kotu' : '');
        if (no === bn && oyun.oy) setTimeout(() => { if (oyun?.oy) oyPanelAc(); }, 1200);
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
      case 'iyi': { const v = oyun.k.get(o[1]); if (v) Sahne.sayiGoster(v.h.position.x, 2.1, v.h.position.z, '+' + o[2], '#7aee5a', 0.5); break; }
      case 'ozel': {
        const [, no, tur] = o, v = oyun.k.get(no); if (!v) break;
        if (tur === 'dirilis') { Sahne.partikul(v.h.position.x, 1, v.h.position.z, 0xff6a1a, 30, 5, 1); Ses.guc('mana'); if (no === bn) buyukYazi('🔥 ANKA TÜYÜ!', 'Ölümden döndün!', 1500); else akis(`🔥 ${kacis(oyuncu(no).ad)} anka tüyüyle ölümden döndü!`); }
        if (tur === 'kacis') { if (no === bn) buyukYazi('👻 KAÇ!', 'Hayalet pelerini seni hızlandırdı', 1100); else akis(`👻 ${kacis(oyuncu(no).ad)} kaçıyor!`); }
        break;
      }
      case 'pat': Sahne.partikul(o[1], 0.8, o[2], 0x2a8a3a, 18, 5); Sahne.partikul(o[1], 0.8, o[2], 0xff4a5a, 14, 4); Ses.vur(1.3); break;
      case 'met': {
        Sahne.partikul(o[1], 0.5, o[2], 0xff7a1a, 30, 6, 0.9); Sahne.partikul(o[1], 0.5, o[2], 0x6a4a2a, 16, 4); Ses.vur(1.5);
        if (ben && Math.hypot(ben.x - o[1], ben.z - o[2]) < 5) Sahne.sars(0.2);
        break;
      }
      case 'sd': akis('🎁 Arenaya ödül sandığı düştü! İlk dokunan açar.'); Ses.sira(); break;
      case 'sa': {
        const x = E.al(o[2]); if (!x) break;
        if (o[1] === bn) buyukYazi('🎁 SANDIK!', `${x.emoji} ${x.ad} çıktı`, 1300); else akis(`🎁 ${kacis(oyuncu(o[1]).ad)} sandığı açtı: ${x.emoji} ${kacis(x.ad)}`);
        Ses.kazandi();
        break;
      }
      case 'oy': oyBasla(o[1], o[2]); break;
      case 'oyv': oySay(o[1]); break;
      case 'oyS': $('oyPanel').classList.add('gizli'); oyun.oy = null; buyukYazi(OY_AD[o[1]], '👥 Seyirciler seçti!', 1600); Ses.gong(); break;
      case 'ks': {
        const [, no, silah, kalkan, canMax] = o, v = oyun.k.get(no); if (!v) break;
        const k = { ...v.kusam }; if (silah) k.silah = silah; else delete k.silah; if (kalkan) k.kalkan = kalkan; else delete k.kalkan;
        v.kusam = k; v.st = E.statlar(k); v.canMax = canMax;
        Insan.giydir(v.h, k);
        if (no === bn && ben) ben.st = E.statlar(k);
        break;
      }
      case 'ya': {
        const [, no, esya, birakti] = o, v = oyun.k.get(no), x = E.al(esya), b = E.al(birakti);
        if (v) Sahne.partikul(v.h.position.x, 1, v.h.position.z, 0xffd36a, 14, 3);
        if (no === bn) { Ses.cik?.(); buyukYazi(`${x.emoji} ${x.ad}`, b ? `aldın! ${b.emoji} ${b.ad} yere düştü` : 'aldın!', 1100); }
        else akis(`🔄 ${kacis(oyuncu(no).ad)} yerden ${x.emoji} ${kacis(x.ad)} aldı`);
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
    $('puanTablo').innerHTML = sirali.map(p => `<li class="${oyun.k.get(p.no)?.olu && oyun.faz === 'arena' ? 'olu' : ''}" style="--r:${renkCss(p.no)}"><span><i>●</i> ${kacis(tAd(p.no))}${p.no === benimNo() ? ' ⭐' : ''}</span><b>${oyun.puan[p.no]}</b></li>`).join('')
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
    if (e.repeat && (e.code === 'KeyK' || e.code === 'Space')) { if (e.code === 'Space') e.preventDefault(); return; }
    if (e.code === 'KeyK' && mod !== 'tek' && oyun) mikDegistir();
    if (e.code === 'KeyE' && !e.repeat) yerdenAlIstek();
    if (e.code === 'Space' && oyun) {
      e.preventDefault();
      if (oyun.faz === 'draft') zarAtIstek();
      else if (oyun.faz === 'arena' && ben?.olu) sonrakiniIzle();
    }
    if ((e.code === 'AltLeft' || e.code === 'AltRight') && document.pointerLockElement) { e.preventDefault(); document.exitPointerLock(); }
  });
  addEventListener('keyup', e => tuslar.delete(e.code));
  const girdiSifirla = () => { tuslar.clear(); sol = sag = false; fare.basili = false; dokunVur.basili = dokunKalkan.basili = false; joy.aktif = false; joy.x = joy.y = 0; bakis.id = null; };
  addEventListener('blur', () => girdiSifirla());
  document.addEventListener('visibilitychange', () => { if (document.hidden) girdiSifirla(); });
  // Fare: ekrana tıklayınca kilitlenir, fareyle etrafa bakılır. Kilitlenemezse basılı sürükleyerek bakılır.
  const arenaDa = () => oyun?.faz === 'arena';
  const fare = { basili: false, oynadi: false, x: 0, y: 0 };
  kanvas.addEventListener('mousedown', e => {
    if (!arenaDa() || dokun) return;
    const kilitli = document.pointerLockElement === kanvas;
    if (!kilitli) {
      const ilk = !fare.denendi; fare.denendi = true;
      try { const p = kanvas.requestPointerLock?.(); if (p?.catch) p.catch(() => {}); } catch (er) { /* kilitlenemiyor */ }
      Object.assign(fare, { basili: true, oynadi: false, x: e.clientX, y: e.clientY, ilk });
      if (e.button === 2) sag = true;
      return;
    }
    if (e.button === 0) sol = true;
    if (e.button === 2) sag = true;
  });
  addEventListener('mouseup', e => {
    if (e.button === 0) { sol = false; if (fare.basili && !fare.oynadi && !fare.ilk && arenaDa() && document.pointerLockElement !== kanvas) tekVur = true; fare.basili = false; }
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
      : kilitli ? 'WASD yürü · Fare bak · Sol tık vur · Sağ tık / Shift kalkan · E yerden al · Alt: fareyi bırak' : '🖱️ Ekrana tıkla: fareyle etrafa bak (olmazsa basılı tutup sürükle)';
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
    const hiz = Motor.HIZ_TEMEL * (1 + ben.st.hiz) * (blk ? 0.5 : 1) * (v.bayrak & 4 ? 1.5 : 1) * (v.bayrak & 32 ? 0.5 : 1) * (ileri < -0.1 ? 0.8 : 1);
    if (savas) {
      let ix = mx * hiz, iz = mz * hiz;
      if (A.tuzak?.tur === 'buz') { const k = Math.min(1, dt * 1.8); ben.mvx = (ben.mvx || 0) + (ix - (ben.mvx || 0)) * k; ben.mvz = (ben.mvz || 0) + (iz - (ben.mvz || 0)) * k; ix = ben.mvx; iz = ben.mvz; }   // buzda kayarsın
      ben.x += ix * dt + ben.vx * dt; ben.z += iz * dt + ben.vz * dt;
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
        if (no === benimNo() || o.olu || (takimli() && no % 2 === benimNo() % 2)) return;
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
      if (b & 2) et.push('🔮 Güçlü vuruş'); if (b & 4) et.push('🧪 Hız'); if (b & 8) et.push('🫧 Koruma'); if (b & 32) et.push('🐌 Yavaşladın');
      if (A.tuzak?.tur === 'buz') et.push('🧊 Buzlu zemin');
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
      $('turSonuBaslik').textContent = m.takim ? (m.takimSag >= 0 ? `${TAKIM[m.takimSag]} ${TAKIM_AD[m.takimSag].toLocaleUpperCase('tr')} TAKIM KAZANDI!` : 'KİMSE KALMADI!') : sagKalan >= 0 ? `${oyuncu(sagKalan).ad.toLocaleUpperCase('tr')} AYAKTA KALDI!` : 'KİMSE KALMADI!';
      const sirali = oyun.oyuncular.slice().sort((a, b) => m.puanlar[b.no] - m.puanlar[a.no]);
      $('turTablo').innerHTML = '<tr><th>Oyuncu</th><th>⚔️</th><th>Bu tur</th><th>Puan</th><th></th></tr>' + sirali.map(p => {
        const arti = m.puanlar[p.no] - (oyun.turBasi?.[p.no] ?? 0);
        return `<tr class="${p.no === bn ? 'ben' : ''}"><td class="ad" style="--r:${renkCss(p.no)}">${p.no === sagKalan || (m.takim && m.takimSag === p.no % 2) ? '👑 ' : ''}${kacis(tAd(p.no))}</td><td>${m.oldurme[p.no]}</td><td class="arti">${arti ? '+' + arti : ''}</td><td><b>${m.puanlar[p.no]}</b></td><td><div class="cubuk"><i style="width:${Math.min(100, m.puanlar[p.no] / m.hedef * 100)}%"></i></div></td></tr>`;
      }).join('');
      ekranGoster('turSonu');
      let kalan = Math.round(m.sure - 1.5);
      const yaz = () => { $('turSonuAlt').textContent = m.bitti ? `🏆 ${oyuncu(m.kazanan).ad} hedefe ulaştı!` : `${m.hedef} puana ilk ulaşan kazanır · Yeni eşya seçimi ${Math.max(0, kalan)} sn sonra`; };
      yaz(); clearInterval(oyun.turSayac); oyun.turSayac = setInterval(() => { kalan--; yaz(); }, 1000);
    }, 1500);
    if (m.takim && bn >= 0 && m.takimSag === bn % 2) { buyukYazi('TAKIMIN KAZANDI! 👑', 'Takımdaki herkese +2 puan', 1500); Ses.kazandi(); Sahne.cosku(4); }
    else if (sagKalan === bn && bn >= 0) { buyukYazi('AYAKTA KALDIN! 👑', '+2 puan', 1500); Ses.kazandi(); Sahne.cosku(4); }
    else { Ses.alkis(); Sahne.cosku(3); }
    puanTabloCiz();
  }
  function oyunBitti(m) {
    oyun.bitti = true;
    clearInterval(oyun.turSayac);
    const bn = benimNo(), kaz = m.sira[0].no;
    $('sonucBaslik').textContent = m.takim ? (m.kazananTakim === bn % 2 ? 'TAKIMIN KAZANDI! 🏆' : `${TAKIM[m.kazananTakim]} ${TAKIM_AD[m.kazananTakim].toLocaleUpperCase('tr')} TAKIM KAZANDI!`) : kaz === bn ? 'KAZANDIN! 🏆' : `${oyuncu(kaz).ad.toLocaleUpperCase('tr')} KAZANDI!`;
    $('sonucSira').innerHTML = m.sira.map(s => `<li style="color:${renkCss(s.no)}"><span style="color:#2a1608">${kacis(tAd(s.no))}${s.no === bn ? ' ⭐' : ''} · <b>${s.puan}</b> puan</span></li>`).join('');
    $('tekrarBtn').classList.toggle('gizli', !yonetici());
    $('sonucBekle').classList.toggle('gizli', yonetici());
    // Kazanan masanın önünde kutlama yapar
    yerdeCiz([]); $('alYazi').classList.add('gizli'); $('alBtn').classList.add('gizli'); $('alYazi').dataset.y = '';
    Sahne.gucleriTemizle(); Sahne.mermileriCiz([]); Sahne.arenaKur(10 + oyun.oyuncular.length, []);
    Masa.kur(oyun.oyuncular.length); oyuncularMasaya(); kameraMasa(true);
    oyun.faz = 'bitti'; oyun.kutlayan = kaz;
    ekranGoster('sonuc');
    if (document.pointerLockElement) document.exitPointerLock();
    ((m.takim ? m.kazananTakim === bn % 2 : kaz === bn) ? Ses.kazandi : Ses.kaybetti)();
    ekstraTemizle(); $('oyPanel').classList.add('gizli');
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
        if (oyun.faz === 'draft') { sureCiz(); imlecleriCiz(dt, simdi); seciyorCiz(simdi); }
        Masa.guncelle(dt, masaSesleri);
        const d = oyun.d, siradaki = d && d.faz === 'secim' ? d.sira[d.siraIdx] : -1;
        oyun.k.forEach((v, no) => {
          const kutla = oyun.faz === 'bitti' ? no === oyun.kutlayan : no === siradaki;
          Insan.oynat(v.h, { dt, hiz: 0, blk: false, olu: false, kutla });
          v.h.position.y = oyun.faz === 'bitti' && kutla ? Math.abs(Math.sin(simdi / 160)) * 0.3 : 0;
        });
      } else if (oyun.faz === 'arena' && oyun.arena) {
        benAdim(dt);
        yerdeAnim(dt, simdi);
        ekstraAnim(dt, simdi);
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
