// =============================================================
// Zarena Savaşları - EJDERHA (boss turu) modeli ve alev görüntüsü
// Ejderha yerel +z yönüne bakar (grubun rotation.y = yön).
// =============================================================

const Ejderha = (() => {
  const GOVDE = 0x7a1a12, KOYU = 0x4a0e0a, KARIN = 0xd8a040, BOYNUZ = 0xf0e0c0;
  const mat = (renk, ek = {}) => new THREE.MeshStandardMaterial({ color: renk, roughness: 0.6, metalness: 0.1, ...ek });
  const kure = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o; };
  const koni = (r, h, m, x, y, z) => { const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), m); o.position.set(x, y, z); return o; };
  const kutu = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };

  function yap() {
    const g = new THREE.Group(), u = {};
    const mG = mat(GOVDE), mK = mat(KOYU), mKarin = mat(KARIN, { roughness: 0.8 }), mB = mat(BOYNUZ, { roughness: 0.4 });
    const mGoz = new THREE.MeshBasicMaterial({ color: 0xffe040 });
    // Gövde
    const govde = new THREE.Group(); g.add(govde); u.govde = govde;
    govde.add(kure(1, mG, 0, 1.7, 0, 1.35, 1.05, 2.3));
    govde.add(kure(1, mKarin, 0, 1.35, 0.1, 1.1, 0.75, 2.0));
    for (let i = 0; i < 7; i++) govde.add(koni(0.18, 0.55, mB, 0, 2.75 - Math.abs(i - 3) * 0.06, -1.6 + i * 0.5));
    // Bacaklar
    u.bacaklar = [];
    [[-1, 1.1], [1, 1.1], [-1, -1.2], [1, -1.2]].forEach(([s, z]) => {
      const b = new THREE.Group(); b.position.set(s * 1.05, 1.3, z); govde.add(b);
      b.add(kure(0.45, mG, 0, -0.25, 0, 1, 1.3, 1));
      const alt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 1.0, 10), mG); alt.position.y = -0.8; b.add(alt);
      b.add(kutu(0.55, 0.18, 0.7, mK, 0, -1.25, 0.15));
      for (let k = -1; k <= 1; k++) { const p = koni(0.07, 0.25, mB, k * 0.17, -1.25, 0.55); p.rotation.x = Math.PI / 2; b.add(p); }
      u.bacaklar.push(b);
    });
    // Boyun + kafa
    const boyun = new THREE.Group(); boyun.position.set(0, 2.2, 1.9); govde.add(boyun); u.boyun = boyun;
    for (let i = 0; i < 4; i++) boyun.add(kure(0.55 - i * 0.05, mG, 0, i * 0.28, i * 0.32, 1, 1, 1.1));
    const kafa = new THREE.Group(); kafa.position.set(0, 1.15, 1.3); boyun.add(kafa); u.kafa = kafa;
    kafa.add(kutu(0.95, 0.75, 1.0, mG, 0, 0, 0));
    kafa.add(kutu(0.7, 0.4, 0.9, mG, 0, 0.05, 0.85));                 // üst çene / burun
    [-1, 1].forEach(s => {
      kafa.add(kure(0.11, mGoz, s * 0.36, 0.2, 0.42));
      const bo = koni(0.12, 0.8, mB, s * 0.32, 0.6, -0.35); bo.rotation.x = -0.9; bo.rotation.z = s * -0.35; kafa.add(bo);
      kafa.add(kure(0.05, mK, s * 0.16, 0.18, 1.3));                  // burun delikleri
      for (let k = 0; k < 3; k++) { const dis = koni(0.04, 0.14, mB, s * 0.28, -0.2, 0.6 + k * 0.28); dis.rotation.x = Math.PI; kafa.add(dis); }   // dişler
    });
    const cene = new THREE.Group(); cene.position.set(0, -0.28, 0.35); kafa.add(cene); u.cene = cene;
    cene.add(kutu(0.62, 0.18, 1.1, mK, 0, -0.08, 0.5));
    // Ağızdaki parıltı (alev hazırlığı)
    u.agizIsik = kure(0.25, new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0 }), 0, -0.15, 1.1);
    kafa.add(u.agizIsik);
    // Kanatlar
    u.kanatlar = [-1, 1].map(s => {
      const k = new THREE.Group(); k.position.set(s * 0.9, 2.5, 0.6); govde.add(k);
      const kol = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.6, 8), mK); kol.rotation.z = s * -Math.PI / 2; kol.position.x = s * 1.8; k.add(kol);
      const sekil = new THREE.Shape(); sekil.moveTo(0, 0); sekil.lineTo(s * 3.6, 0); sekil.lineTo(s * 3.0, -1.6); sekil.lineTo(s * 2.2, -1.0); sekil.lineTo(s * 1.5, -2.2); sekil.lineTo(s * 0.8, -1.2); sekil.lineTo(0, -2.0); sekil.lineTo(0, 0);
      const zar = new THREE.Mesh(new THREE.ShapeGeometry(sekil), new THREE.MeshStandardMaterial({ color: 0x6a1410, side: THREE.DoubleSide, roughness: 0.9, transparent: true, opacity: 0.92 }));
      zar.rotation.x = Math.PI / 2; k.add(zar);
      return k;
    });
    // Kuyruk
    const kuyruk = new THREE.Group(); kuyruk.position.set(0, 1.6, -2.1); govde.add(kuyruk); u.kuyruk = kuyruk;
    let onceki = kuyruk; u.kuyrukParca = [];
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Group(); p.position.z = i === 0 ? 0 : -0.62; onceki.add(p);
      p.add(kure(0.5 - i * 0.07, mG, 0, 0, -0.3, 1, 0.9, 1.3));
      p.add(koni(0.1, 0.35, mB, 0, 0.42 - i * 0.06, -0.3));
      u.kuyrukParca.push(p); onceki = p;
    }
    { const uc = koni(0.3, 0.6, mB, 0, 0, -0.9); uc.rotation.x = -Math.PI / 2; onceki.add(uc); }
    // Alev (ağızdan ileri doğru genişleyen koni) + yerde uyarı alanı
    const alev = new THREE.Group(); alev.visible = false; g.add(alev); u.alev = alev;
    const dis = new THREE.Mesh(new THREE.ConeGeometry(3.8, 10, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xff6a10, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    dis.rotation.x = -Math.PI / 2; dis.position.set(0, 1.5, 2.4 + 5); alev.add(dis);
    const ic = new THREE.Mesh(new THREE.ConeGeometry(2.0, 8, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe060, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ic.rotation.x = -Math.PI / 2; ic.position.set(0, 1.5, 2.4 + 4); alev.add(ic);
    u.alevParca = [dis, ic];
    const uyari = new THREE.Mesh(new THREE.CircleGeometry(11, 24, -Math.PI / 2 - 0.36, 0.72), new THREE.MeshBasicMaterial({ color: 0xff2a10, transparent: true, opacity: 0.0, depthWrite: false }));
    uyari.rotation.x = -Math.PI / 2; uyari.position.set(0, 0.05, 2.4); g.add(uyari); u.uyari = uyari;
    g.traverse(o => { if (o.isMesh && o.material.type === 'MeshStandardMaterial') { o.castShadow = true; } });
    g.userData = { ...u, t: 0, durum: 0, olum: 0, kacis: 0 };
    return g;
  }

  // durum: 0 yürü · 1 alev hazırlığı · 2 alev · 3 ısırık · 4 kuyruk · 5 öldü · 8 koşarak saldırı · 9 geri çekilme · 10 uçuş · 11 iniş
  // hiz: yürüme hızı (0..1), ust: yerden yükseklik (uçarken)
  const yaklas = (a, b, k) => a + (b - a) * k;
  function guncelle(g, durum, hiz, dt, kacti, ust = 0) {
    const u = g.userData; u.t += dt;
    const t = u.t, k = Math.min(1, dt * 8);
    if (durum !== u.sonDurum) { u.sonDurum = durum; u.durumT = 0; }
    u.durumT += dt;
    if (durum === 5) {   // devrilir
      u.olum = Math.min(1, u.olum + dt * 0.8);
      g.rotation.z = u.olum * 1.4; g.position.y = -u.olum * 0.5;
      u.alev.visible = false; u.uyari.material.opacity = 0; u.agizIsik.material.opacity = 0;
      u.kanatlar.forEach((kn, i) => { kn.rotation.z = (i ? -1 : 1) * 0.6; });
      return;
    }
    if (kacti) { u.kacis += dt; ust += u.kacis * u.kacis * 3; }
    const ucuyor = durum === 10 || durum === 11 || kacti;
    g.position.y = ust + (durum === 10 && ust > 3 ? Math.sin(t * 3) * 0.25 : 0);
    // Kanatlar: yerde katlı durur, alev öncesi açılır, uçarken güçlü çırpar, inerken açılır
    let kanatAci, kanatGenlik, kanatHiz;
    if (ucuyor) { kanatAci = 0.15; kanatGenlik = durum === 11 ? 0.2 : 0.85; kanatHiz = durum === 11 ? 4 : 8; }
    else if (durum === 1 || durum === 8) { kanatAci = 0.05; kanatGenlik = 0.35; kanatHiz = durum === 8 ? 10 : 5; }
    else if (durum === 9) { kanatAci = 0.2; kanatGenlik = 0.3; kanatHiz = 6; }
    else { kanatAci = 0.55; kanatGenlik = 0.08; kanatHiz = 1.6; }
    u.kanatlar.forEach((kn, i) => {
      const s = i ? -1 : 1, hedef = s * (kanatAci + Math.sin(t * kanatHiz) * kanatGenlik);
      kn.rotation.z = yaklas(kn.rotation.z, hedef, Math.min(1, dt * 12));
      kn.rotation.y = yaklas(kn.rotation.y, ucuyor ? 0 : s * -0.35, k);
    });
    // Bacaklar: yürüme / koşu / geri çekilme; uçarken toplanır
    const adim = durum === 8 ? 14 : durum === 9 ? -7 : 6, genlik = durum === 8 ? 0.8 : durum === 9 ? 0.45 : 0.45 * hiz;
    u.bacaklar.forEach((b, i) => {
      const hedef = ucuyor && durum !== 11 ? -0.9 : Math.sin(t * adim + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * genlik;
      b.rotation.x = yaklas(b.rotation.x, hedef, Math.min(1, dt * 15));
    });
    // Gövde: koşarken öne eğilir, geri çekilirken dikleşir, alev öncesi şahlanır
    const egim = durum === 8 ? 0.18 : durum === 1 ? -0.22 : durum === 9 ? -0.08 : durum === 10 ? -0.1 : 0;
    u.govde.rotation.x = yaklas(u.govde.rotation.x, egim, k);
    u.govde.position.y = durum === 8 ? Math.abs(Math.sin(t * 14)) * 0.18 : Math.abs(Math.sin(t * 6)) * 0.08 * hiz;
    // Kuyruk: sallanır; savururken gövdeyle birlikte hızla döner
    const savur = durum === 4 ? Math.sin(Math.min(1, u.durumT / 0.5) * Math.PI) : 0;
    u.govde.rotation.y = yaklas(u.govde.rotation.y, savur * 0.9, Math.min(1, dt * 14));
    u.kuyrukParca.forEach((p, i) => { p.rotation.y = Math.sin(t * (durum === 8 ? 5 : 1.6) - i * 0.6) * (durum === 8 ? 0.2 : 0.12) + savur * 0.4; p.rotation.x = ucuyor ? 0.08 : 0; });
    // Boyun ve kafa: ısırırken önce geri çekilir, sonra ileri atılır
    let boyunZ = 1.9, boyunX = Math.sin(t * 1.1) * 0.05, acik = 0.08 + Math.sin(t * 1.3) * 0.04;
    if (durum === 3) {
      const f = u.durumT / 0.55;
      if (f < 0.6) { boyunZ = 1.9 - f / 0.6 * 0.5; boyunX = -0.35; acik = 0.75; }          // geri çekil, ağzı aç
      else { boyunZ = 1.4 + (f - 0.6) / 0.4 * 1.6; boyunX = 0.5; acik = 0.8; }              // ileri atıl
    } else if (u.sonIsirik && u.durumT < 0.25 && durum === 0) { boyunZ = 3.0; boyunX = 0.45; acik = 0.02; }   // çeneyi kapat
    if (durum === 1) { boyunX = -0.45; acik = 0.4; }                     // başını kaldırıp nefes alır
    if (durum === 2) { boyunX = 0.3; acik = 0.75; }                      // alev püskürtür
    if (durum === 8) { boyunX = 0.25; acik = 0.55; boyunZ = 2.2; }       // ağzı açık koşar
    if (durum === 11) { boyunX = -0.3; acik = 0.6; }
    u.sonIsirik = durum === 3 || (u.sonIsirik && durum === 0 && u.durumT < 0.25);
    u.boyun.position.z = yaklas(u.boyun.position.z, boyunZ, Math.min(1, dt * (durum === 3 ? 18 : 8)));
    u.boyun.rotation.x = yaklas(u.boyun.rotation.x, boyunX, Math.min(1, dt * 9));
    u.cene.rotation.x = yaklas(u.cene.rotation.x, acik, Math.min(1, dt * 14));
    // alev hazırlığı: ağızda kor, yerde uyarı
    u.agizIsik.material.opacity = durum === 1 ? 0.55 + Math.sin(t * 25) * 0.35 : durum === 2 ? 0.95 : 0;
    u.agizIsik.scale.setScalar(durum === 1 ? 0.8 + u.durumT * 1.2 : 1.6);
    u.uyari.material.opacity = durum === 1 ? 0.22 + Math.abs(Math.sin(t * 10)) * 0.28 : durum === 2 ? 0.15 : 0;
    u.alev.visible = false;   // alev artık parçacıklarla çiziliyor (Alev)
  }
  // Ağız ucunun dünyadaki yeri ve yönü (alev parçacıkları buradan çıkar)
  const _v = new THREE.Vector3();
  function agiz(g) {
    g.userData.kafa.getWorldPosition(_v);
    const y = g.rotation.y;
    return { x: _v.x + Math.sin(y) * 1.2, y: _v.y - 0.1, z: _v.z + Math.cos(y) * 1.2, yon: y };
  }
  // Kafanın dünyadaki yeri (hasar sayıları için)
  function kafaNoktasi(g) { const v = new THREE.Vector3(); g.userData.kafa.getWorldPosition(v); return v; }

  return { yap, guncelle, agiz, kafaNoktasi };
})();

// =============================================================
// ALEV: gerçekçi ateş parçacıkları (ejderhanın nefesi, yerden fışkıran ateş)
// Her parçacık beyaz-sarı başlar, turuncu, kırmızı olur, kararıp söner; büyüyerek yükselir.
// =============================================================
const Alev = (() => {
  let havuz = null, sira = 0, doku = null;
  const telefon = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const ADET = telefon ? 220 : 480;
  const RENK = [[1, 0.92, 0.55], [1, 0.62, 0.15], [0.98, 0.36, 0.06], [0.55, 0.14, 0.04], [0.18, 0.15, 0.14]];
  function dokuYap() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.userData.paylasimli = true;
    return t;
  }
  function kur() {
    if (havuz || typeof Sahne === 'undefined' || !Sahne.scene) return;
    doku = dokuYap(); havuz = [];
    const grup = new THREE.Group(); grup.userData.paylasimli = true; Sahne.scene.add(grup);
    for (let i = 0; i < ADET; i++) {
      const m = new THREE.SpriteMaterial({ map: doku, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0 });
      m.userData.paylasimli = true;
      const s = new THREE.Sprite(m); s.visible = false; s.userData.paylasimli = true; grup.add(s);
      havuz.push({ s, t: 0, omur: 0, vx: 0, vy: 0, vz: 0, b0: 0.4, b1: 1.5 });
    }
  }
  // Tek parçacık: konum, hız, ömür, başlangıç ve bitiş boyu
  function yay(x, y, z, vx, vy, vz, omur, b0 = 0.5, b1 = 1.8) {
    if (!havuz) kur(); if (!havuz) return;
    const p = havuz[sira]; sira = (sira + 1) % havuz.length;
    p.s.position.set(x, y, z); Object.assign(p, { vx, vy, vz, t: 0, omur, b0, b1 });
    p.s.visible = true;
  }
  // Ejderhanın nefesi: ağızdan ileri doğru açılan alev
  function nefes(a, adet) {
    for (let i = 0; i < adet; i++) {
      const s = (Math.random() - 0.5) * 0.55, hz = 11 + Math.random() * 6, y = a.yon + s;
      yay(a.x, a.y, a.z, Math.sin(y) * hz, -0.6 + Math.random() * 1.4, Math.cos(y) * hz, 0.55 + Math.random() * 0.3, 0.45, 2.6 + Math.random());
    }
  }
  // Yerden fışkıran ateş sütunu
  function sutun(x, z, r, adet) {
    for (let i = 0; i < adet; i++) {
      const a = Math.random() * Math.PI * 2, d = Math.random() * r;
      yay(x + Math.sin(a) * d, 0.15, z + Math.cos(a) * d, (Math.random() - 0.5) * 1.2, 5 + Math.random() * 4, (Math.random() - 0.5) * 1.2, 0.45 + Math.random() * 0.3, 0.6, 1.7);
    }
  }
  // Kor / kıvılcım (uyarı)
  function kor(x, y, z) { yay(x, y, z, (Math.random() - 0.5) * 0.8, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 0.8, 0.5, 0.15, 0.3); }
  function guncelle(dt) {
    if (!havuz) return;
    for (const p of havuz) {
      if (!p.s.visible) continue;
      p.t += dt;
      const f = p.t / p.omur;
      if (f >= 1) { p.s.visible = false; continue; }
      p.vy += 2.5 * dt; p.vx *= 1 - dt * 1.2; p.vz *= 1 - dt * 1.2;   // sıcak hava yükselir, ileri hız azalır
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      if (p.s.position.y < 0.1) { p.s.position.y = 0.1; p.vy = Math.abs(p.vy) * 0.3; }
      const boy = p.b0 + (p.b1 - p.b0) * Math.sqrt(f); p.s.scale.set(boy, boy, 1);
      const r = f * (RENK.length - 1), i = Math.min(RENK.length - 2, Math.floor(r)), k = r - i, a = RENK[i], b = RENK[i + 1];
      p.s.material.color.setRGB(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      // ilk yarı: parlayan ateş (ışık ekler), ikinci yarı: sönen kor ve duman
      const parlak = f < 0.5, ist = parlak ? THREE.AdditiveBlending : THREE.NormalBlending;
      if (p.s.material.blending !== ist) p.s.material.blending = ist;
      p.s.material.opacity = parlak ? (f < 0.08 ? f / 0.08 : 1) * 0.42 : (1 - (f - 0.5) / 0.5) * 0.55;
      p.s.material.rotation += dt * 2;
    }
  }
  function temizle() { if (havuz) havuz.forEach(p => { p.s.visible = false; }); }
  return { yay, nefes, sutun, kor, guncelle, temizle };
})();
