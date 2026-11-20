// =============================================================
// Zarena Savaşları - 3D SAHNE: arena, tribün, sütunlar, daralan alan,
// güçlendirmeler, mermiler, kıvılcımlar, hasar sayıları, isim/can etiketleri.
// =============================================================

const Sahne = (() => {
  let renderer, scene, camera, isik;
  const ray = new THREE.Raycaster(), zemin = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let arenaGrup = null, alanDuvar = null, alanZemin = null, alanR = -1, arenaR = 12;
  const kamHedef = new THREE.Vector3(0, 0, 0), kamPoz = new THREE.Vector3(0, 30, 20);
  let kamMod = 'draft', kamSarsinti = 0;
  const paylasilan = new Map();
  function paylas(k, f) { if (!paylasilan.has(k)) { const o = f(); o.userData = o.userData || {}; o.userData.paylasimli = true; paylasilan.set(k, o); } return paylasilan.get(k); }

  function kur(kanvas) {
    renderer = new THREE.WebGLRenderer({ canvas: kanvas, antialias: true });
    const telefon = matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(telefon ? 1.5 : 2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ac8f0);
    scene.fog = new THREE.Fog(0xb8dcf0, 70, 190);
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
    { // gökyüzü kubbesi (yukarısı koyu mavi, ufuk açık)
      const c = document.createElement('canvas'); c.width = 4; c.height = 256;
      const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#2f78c8'); gr.addColorStop(0.45, '#7ab8e8'); gr.addColorStop(0.5, '#cfe6f4'); gr.addColorStop(1, '#e8d8b8');
      g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false })));
      for (let i = 0; i < 14; i++) {   // bulutlar
        const b = new THREE.Group(), a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 80;
        for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(6 + Math.random() * 5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })); m.position.set(k * 7 - 14, Math.random() * 3, Math.random() * 6); m.scale.y = 0.55; b.add(m); }
        b.position.set(Math.sin(a) * r, 55 + Math.random() * 35, Math.cos(a) * r); b.lookAt(0, b.position.y, 0); scene.add(b);
      }
    }
    scene.add(new THREE.HemisphereLight(0xdff0ff, 0x8a6a40, 0.9));
    isik = new THREE.DirectionalLight(0xfff2dd, 1.6);
    isik.position.set(14, 30, 10); isik.castShadow = true;
    isik.shadow.mapSize.set(telefon ? 1024 : 2048, telefon ? 1024 : 2048);
    Object.assign(isik.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 80 });
    scene.add(isik);
    // Uzak zemin
    const yer = new THREE.Mesh(new THREE.CircleGeometry(160, 40), new THREE.MeshStandardMaterial({ color: 0x8ab060, roughness: 1 }));
    yer.rotation.x = -Math.PI / 2; yer.position.y = -0.6; yer.receiveShadow = true; scene.add(yer);
    arenaKur(14, []);
    window.addEventListener('resize', boyut); boyut();
  }
  function boyut() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // Sahneden çıkarılan nesnelerin GPU belleğini boşaltır (paylaşılan önbellekteki parçalar hariç)
  function at(obj, haric) {
    if (!obj) return;
    obj.parent && obj.parent.remove(obj);
    obj.traverse(o => {
      if (haric && haric(o)) return;
      if (o.userData?.paylasimli) return;
      if (o.geometry && !o.geometry.userData?.paylasimli) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      ms.forEach(m => { if (m.userData?.paylasimli) return; if (m.map && m.map !== kum && !m.map.userData?.paylasimli) m.map.dispose(); m.dispose(); });
    });
  }
  function kumDoku() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#e2c58c'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < 0.5 ? '#d4b47a' : '#ecd4a0'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  let kum = null;
  // ---------- Arena ----------
  function arenaKur(R, sutunlar) {
    at(arenaGrup);
    arenaR = R; alanR = -1;
    const g = new THREE.Group(); arenaGrup = g; scene.add(g);
    kum = kum || kumDoku();
    const taban = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.3, R + 0.5, 0.6, 64), new THREE.MeshStandardMaterial({ map: kum, roughness: 1 }));
    taban.position.y = -0.3; taban.receiveShadow = true; g.add(taban);
    // ortada desen
    const desen = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.5, 40), new THREE.MeshBasicMaterial({ color: 0xb08a50, transparent: true, opacity: 0.6 }));
    desen.rotation.x = -Math.PI / 2; desen.position.y = 0.01; g.add(desen);
    // Kenar duvarı (yüksek, kemerli) ve tribün basamakları (halka şeklinde, içi boş)
    const DUVAR = 2.8, BAS = R + 1.6;
    const profil = [new THREE.Vector2(R + 0.9, -0.6), new THREE.Vector2(R + 0.9, DUVAR), new THREE.Vector2(BAS, DUVAR)];
    for (let k = 0; k < 5; k++) { const r = BAS + k * 1.2, y = DUVAR + 0.55 + k * 0.7; profil.push(new THREE.Vector2(r, y), new THREE.Vector2(r + 1.2, y)); }
    const disR = BAS + 5 * 1.2, disY = DUVAR + 0.55 + 4 * 0.7;
    profil.push(new THREE.Vector2(disR, disY + 1.6), new THREE.Vector2(disR + 0.6, disY + 1.6), new THREE.Vector2(disR + 0.6, -0.6));
    const tribun = new THREE.Mesh(new THREE.LatheGeometry(profil, 96), new THREE.MeshStandardMaterial({ color: 0xc8b494, roughness: 1, side: THREE.DoubleSide }));
    tribun.receiveShadow = true; g.add(tribun);
    // kemerler ve meşaleler
    const kemerSay = Math.round(Math.PI * 2 * R / 3.4), kM = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 1 }), cM = new THREE.MeshStandardMaterial({ color: 0x8a7a64, roughness: 1 });
    g.userData.alevler = [];
    for (let i = 0; i < kemerSay; i++) {
      const a = (i + 0.5) / kemerSay * Math.PI * 2, r = R + 0.88;
      const kg = new THREE.Group(); kg.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); kg.rotation.y = a + Math.PI; g.add(kg);
      const kapi = new THREE.Mesh(paylas('kemerKapi', () => new THREE.PlaneGeometry(1.3, 1.5)), kM); kapi.position.y = 0.75; kg.add(kapi);
      const ust = new THREE.Mesh(paylas('kemerUst', () => new THREE.CircleGeometry(0.65, 16, 0, Math.PI)), kM); ust.position.y = 1.5; kg.add(ust);
      const cerceve = new THREE.Mesh(paylas('kemerCerceve', () => new THREE.BoxGeometry(1.6, 0.14, 0.12)), cM); cerceve.position.set(0, 2.35, 0.05); kg.add(cerceve);
      if (i % 2 === 0) {
        const m = new THREE.Group(), b2 = a + 1.7 / r; m.position.set(Math.sin(b2) * (R + 0.8), 1.9, Math.cos(b2) * (R + 0.8)); g.add(m);
        m.add(new THREE.Mesh(paylas('mesaleG', () => new THREE.CylinderGeometry(0.05, 0.035, 0.45, 6)), paylas('mesaleM', () => new THREE.MeshStandardMaterial({ color: 0x3a2414 }))));
        const alev = new THREE.Mesh(paylas('alevG', () => new THREE.SphereGeometry(0.1, 8, 6)), paylas('alevM', () => new THREE.MeshBasicMaterial({ color: 0xffa21a }))); alev.position.y = 0.3; alev.scale.y = 1.6; m.add(alev);
        g.userData.alevler.push(alev);
      }
    }
    { // büyük ahşap kapı
      const kapi = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 0.2), new THREE.MeshStandardMaterial({ color: 0x5a3416, roughness: 0.9 })); kapi.position.set(0, 1.3, -(R + 0.95)); g.add(kapi);
      for (let i = -1; i <= 1; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.22), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6 })); d.position.set(i * 1.0, 1.3, -(R + 0.94)); g.add(d); }
    }
    const tas = new THREE.MeshStandardMaterial({ color: 0xbfae96, roughness: 0.9 });
    const seyirci = [];
    const KAFA = [0xf2c9a0, 0xe0ac7e, 0xc48a5a, 0x8d5a34], ELBISE = [0xe8483a, 0x2f7de0, 0x3fbf4a, 0xffc21a, 0xa04ae0, 0xff7ab8, 0xffffff, 0x333333];
    const sayi = Math.round(100 + R * 16);
    const govdeG = new THREE.BoxGeometry(0.42, 0.6, 0.3), basG = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const gM = new THREE.MeshStandardMaterial({ roughness: 0.9 }), bM = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const gI = new THREE.InstancedMesh(govdeG, gM, sayi), bI = new THREE.InstancedMesh(basG, bM, sayi);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s1 = new THREE.Vector3(1, 1, 1), renk = new THREE.Color();
    for (let i = 0; i < sayi; i++) {
      const k = i % 5, a = Math.random() * Math.PI * 2, r = R + 1.6 + k * 1.2 + 0.6 + (Math.random() - 0.5) * 0.3, y = 2.8 + 0.55 + k * 0.7;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a + Math.PI);
      const x = Math.sin(a) * r, z = Math.cos(a) * r;
      m4.compose(new THREE.Vector3(x, y + 0.3, z), q, s1); gI.setMatrixAt(i, m4); gI.setColorAt(i, renk.setHex(ELBISE[i % ELBISE.length]));
      m4.compose(new THREE.Vector3(x, y + 0.75, z), q, s1); bI.setMatrixAt(i, m4); bI.setColorAt(i, renk.setHex(KAFA[(i * 7) % KAFA.length]));
      seyirci.push({ x, y, z, faz: Math.random() * 6 });
    }
    g.add(gI, bI); g.userData.seyirci = { gI, bI, liste: seyirci, q: new THREE.Quaternion() };
    // Bayrak direkleri
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, r = R + 1.6 + 6.2;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5, 6), new THREE.MeshStandardMaterial({ color: 0x5a3a1a }));
      d.position.set(Math.sin(a) * r, 8.5, Math.cos(a) * r); g.add(d);
      const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ color: Insan.RENKLER[i], side: THREE.DoubleSide }));
      b.position.set(Math.sin(a) * r + Math.cos(a) * 0.8, 10.3, Math.cos(a) * r - Math.sin(a) * 0.8); b.rotation.y = a + Math.PI / 2; g.add(b);
    }
    // Sütunlar
    sutunlar.forEach(c => {
      const s = new THREE.Group();
      const govde = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.82, c.r * 0.9, 4, 16), tas); govde.position.y = 2.15;
      const bas = new THREE.Mesh(new THREE.BoxGeometry(c.r * 2.3, 0.35, c.r * 2.3), tas); bas.position.y = 4.3;
      const ayak = new THREE.Mesh(new THREE.BoxGeometry(c.r * 2.3, 0.3, c.r * 2.3), tas); ayak.position.y = 0.15;
      [govde, bas, ayak].forEach(m => { m.castShadow = true; m.receiveShadow = true; s.add(m); });
      s.position.set(c.x, 0, c.z); g.add(s);
    });
    // Daralan alan: kırmızı duvar ve dışında kırmızı zemin
    alanDuvar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 6, 64, 1, true), new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
    alanDuvar.position.y = 3; alanDuvar.visible = false; g.add(alanDuvar);
    alanZemin = new THREE.Mesh(new THREE.RingGeometry(R, R + 0.3, 64), new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.35, depthWrite: false }));
    alanZemin.rotation.x = -Math.PI / 2; alanZemin.position.y = 0.03; alanZemin.visible = false; g.add(alanZemin);
  }
  function alanGuncelle(zr) {
    if (!alanDuvar) return;
    const goster = zr < arenaR - 0.05;
    alanDuvar.visible = alanZemin.visible = goster;
    if (!goster || Math.abs(zr - alanR) < 0.04) return;
    alanR = zr;
    alanDuvar.scale.set(zr, 1, zr);
    alanZemin.geometry.dispose(); alanZemin.geometry = new THREE.RingGeometry(zr, arenaR + 0.3, 64);
  }

  // ---------- Kamera ----------
  // 'yorunge': bir noktanın etrafında döner (eşya seçimi). 'elle': oyun.js her kare konum verir (arena, karakter arkası)
  const yor = { hedef: new THREE.Vector3(0, 0.9, -0.4), yaw: 0, pitch: 0.5, mesafe: 8 };
  const elPoz = new THREE.Vector3(), elBak = new THREE.Vector3();
  function yorunge(o) { kamMod = 'yorunge'; Object.assign(yor, o); }
  function elle(poz, bak) { kamMod = 'elle'; elPoz.copy(poz); elBak.copy(bak); }
  function sars(k) { kamSarsinti = Math.max(kamSarsinti, k); }
  function kameraGuncelle(dt) {
    if (kamMod === 'yorunge') {
      const cp = Math.cos(yor.pitch);
      const hp = new THREE.Vector3(Math.sin(yor.yaw) * cp, Math.sin(yor.pitch), Math.cos(yor.yaw) * cp).multiplyScalar(yor.mesafe).add(yor.hedef);
      const k = Math.min(1, dt * 7);
      kamHedef.lerp(yor.hedef, k); kamPoz.lerp(hp, k);
    } else { kamHedef.copy(elBak); kamPoz.copy(elPoz); }
    camera.position.copy(kamPoz);
    if (kamSarsinti > 0) { camera.position.x += (Math.random() - 0.5) * kamSarsinti; camera.position.y += (Math.random() - 0.5) * kamSarsinti; kamSarsinti = Math.max(0, kamSarsinti - dt * 2.5); }
    camera.lookAt(kamHedef);
  }
  function kameraSifirla() { kameraGuncelle(10); }
  const yorungeAl = () => yor;

  // Ekrandaki noktanın zemindeki yeri
  const v2 = new THREE.Vector2(), v3 = new THREE.Vector3();
  function zemindeNokta(cx, cy) {
    v2.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(v2, camera);
    return ray.ray.intersectPlane(zemin, v3) ? { x: v3.x, z: v3.z } : null;
  }

  // ---------- Etiketler ----------
  function etiketYap(ad, renk) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 80;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(2.0, 0.62, 1); s.position.y = 2.45; s.renderOrder = 5;
    s.userData = { c, t, ad, renk, can: -1, canMax: -1 };
    etiketCiz(s, 1, 1);
    return s;
  }
  function etiketCiz(s, can, canMax, gizliCan) {
    const u = s.userData;
    if (u.can === can && u.canMax === canMax && u.gizli === gizliCan) return;
    u.can = can; u.canMax = canMax; u.gizli = gizliCan;
    const x = u.c.getContext('2d');
    x.clearRect(0, 0, 256, 80);
    x.font = '900 30px Nunito, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 7; x.strokeStyle = '#000b'; x.strokeText(u.ad, 128, 24); x.fillStyle = u.renk; x.fillText(u.ad, 128, 24);
    if (!gizliCan) {
      const o = Math.max(0, Math.min(1, can / Math.max(1, canMax)));
      x.fillStyle = '#000a'; x.fillRect(38, 50, 180, 20);
      x.fillStyle = o > 0.5 ? '#5ad84a' : o > 0.25 ? '#ffc21a' : '#ff3a2a'; x.fillRect(41, 53, 174 * o, 14);
      x.font = '900 15px Nunito, sans-serif'; x.fillStyle = '#fff'; x.fillText(String(Math.max(0, Math.ceil(can))), 128, 61);
    }
    u.t.needsUpdate = true;
  }

  // ---------- Kıvılcım / parçacık ----------
  const parcalar = [];
  const parcaG = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const parcaMat = new Map();
  function partikul(x, y, z, renk, sayi = 10, hiz = 3, omur = 0.6) {
    if (parcalar.length > 400) return;   // telefon yorulmasın
    let m = parcaMat.get(renk);
    if (!m) { m = new THREE.MeshBasicMaterial({ color: renk }); parcaMat.set(renk, m); }
    for (let i = 0; i < sayi; i++) {
      const p = new THREE.Mesh(parcaG, m);
      p.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, u = Math.random();
      p.userData = { vx: Math.cos(a) * hiz * u, vy: hiz * (0.4 + Math.random() * 0.8), vz: Math.sin(a) * hiz * u, omur, t: 0 };
      scene.add(p); parcalar.push(p);
    }
  }
  // Uçan sayı (hasar, +can)
  const sayilar = [];
  function sayiGoster(x, y, z, metin, renk = '#fff', boy = 1) {
    const c = document.createElement('canvas'); c.width = 192; c.height = 80;
    const g = c.getContext('2d'); g.font = '900 54px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 9; g.strokeStyle = '#000c'; g.strokeText(metin, 96, 42); g.fillStyle = renk; g.fillText(metin, 96, 42);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    s.scale.set(1.9 * boy, 0.8 * boy, 1); s.position.set(x + (Math.random() - 0.5) * 0.4, y, z); s.renderOrder = 7;
    s.userData = { t: 0, vy: 1.6 }; scene.add(s); sayilar.push(s);
  }
  const emojiMat = new Map();
  function emojiSprite(e, boy = 0.8) {
    let m = emojiMat.get(e);
    if (!m) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'); x.font = '100px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, 64, 72);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.paylasimli = true;
      m = new THREE.SpriteMaterial({ map: t, transparent: true }); m.userData.paylasimli = true; emojiMat.set(e, m);
    }
    const s = new THREE.Sprite(m);
    s.scale.set(boy, boy, 1); return s;
  }

  // Yazı etiketi (masadaki eşya adları, sıra numaraları)
  function metinSprite(metin, renk = '#fff', boy = 0.5) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = '900 44px Nunito, sans-serif';
    const w = Math.ceil(g.measureText(metin).width) + 34; c.width = w; c.height = 64;
    g.font = '900 44px Nunito, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#000a'; g.beginPath(); g.roundRect(2, 4, w - 4, 56, 18); g.fill();
    g.fillStyle = renk; g.fillText(metin, w / 2, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
    sp.scale.set(boy * w / 64, boy, 1); sp.renderOrder = 6;
    return sp;
  }

  // ---------- Güçlendirmeler ----------
  const GUC_EMOJI = { mana: '🔮', hiz: '🧪', can: '❤️', koruma: '🫧' };
  const GUC_RENK = { mana: 0xa04ae0, hiz: 0x2fc8ff, can: 0xff3a5a, koruma: 0x8af0ff };
  const guclerMap = new Map();
  function gucleriCiz(liste) {
    const var_ = new Set();
    liste.forEach(([id, x, z, tur]) => {
      var_.add(id);
      if (guclerMap.has(id)) return;
      const g = new THREE.Group();
      const disk = new THREE.Mesh(paylas('gucDisk', () => new THREE.CircleGeometry(0.55, 24)), paylas('gucMat' + tur, () => new THREE.MeshBasicMaterial({ color: GUC_RENK[tur], transparent: true, opacity: 0.45, depthWrite: false })));
      disk.rotation.x = -Math.PI / 2; disk.position.y = 0.04; g.add(disk);
      const s = emojiSprite(GUC_EMOJI[tur], 0.9); s.position.y = 0.9; g.add(s);
      g.position.set(x, 0, z); g.userData = { s, faz: Math.random() * 6 };
      scene.add(g); guclerMap.set(id, g);
      partikul(x, 0.5, z, GUC_RENK[tur], 8, 2);
    });
    guclerMap.forEach((g, id) => { if (!var_.has(id)) { at(g); guclerMap.delete(id); } });
  }
  function gucleriTemizle() { gucleriCiz([]); }

  // ---------- Mermiler ----------
  const mermiMap = new Map();
  const PG = (k, f) => paylas('g' + k, f), PM = (k, f) => paylas('m' + k, f);
  function mermiYap(tur) {
    const g = new THREE.Group();
    if (tur === 'ok') {
      const c = new THREE.Mesh(PG('okSap', () => new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5)), PM('okSap', () => new THREE.MeshStandardMaterial({ color: 0x8a5a2a }))); c.rotation.x = Math.PI / 2; g.add(c);
      const u = new THREE.Mesh(PG('okUc', () => new THREE.ConeGeometry(0.05, 0.14, 6)), PM('okUc', () => new THREE.MeshStandardMaterial({ color: 0xc8ced6, metalness: 0.7 }))); u.rotation.x = Math.PI / 2; u.position.z = 0.45; g.add(u);
      const t = new THREE.Mesh(PG('okTuy', () => new THREE.BoxGeometry(0.12, 0.01, 0.15)), PM('beyaz', () => new THREE.MeshStandardMaterial({ color: 0xffffff }))); t.position.z = -0.35; g.add(t);
    } else if (tur === 'ates') {
      g.add(new THREE.Mesh(PG('ates1', () => new THREE.SphereGeometry(0.22, 12, 8)), PM('ates1', () => new THREE.MeshBasicMaterial({ color: 0xffa21a }))));
      g.add(new THREE.Mesh(PG('ates2', () => new THREE.SphereGeometry(0.34, 12, 8)), PM('ates2', () => new THREE.MeshBasicMaterial({ color: 0xff4a1a, transparent: true, opacity: 0.4 }))));
    } else if (tur === 'su') {
      g.add(new THREE.Mesh(PG('su', () => new THREE.SphereGeometry(0.09, 8, 6)), PM('su', () => new THREE.MeshStandardMaterial({ color: 0x5ab4ff, transparent: true, opacity: 0.7, roughness: 0.1 }))));
    } else if (tur === 'terlik') {
      const t = new THREE.Mesh(PG('terlik', () => new THREE.BoxGeometry(0.14, 0.035, 0.3)), PM('terlik', () => new THREE.MeshStandardMaterial({ color: 0x3ab4e8 }))); t.rotation.z = 0.4; g.add(t);
      g.userData.dondur = true;
    } else if (tur === 'domates') {
      g.add(new THREE.Mesh(PG('domates', () => new THREE.SphereGeometry(0.14, 10, 8)), PM('domates', () => new THREE.MeshStandardMaterial({ color: 0xe8302a, roughness: 0.4 }))));
      const s = new THREE.Mesh(PG('sap', () => new THREE.BoxGeometry(0.08, 0.04, 0.08)), PM('sap', () => new THREE.MeshStandardMaterial({ color: 0x3a9a2a }))); s.position.y = 0.13; g.add(s);
    } else {
      g.add(new THREE.Mesh(PG('tas', () => new THREE.DodecahedronGeometry(0.11)), PM('tas', () => new THREE.MeshStandardMaterial({ color: 0x8a8a8a }))));
    }
    g.traverse(m => { m.castShadow = true; });
    return g;
  }
  function mermileriCiz(liste) {
    const var_ = new Set();
    liste.forEach(([id, x, z, tur, yon]) => {
      var_.add(id);
      let g = mermiMap.get(id);
      if (!g) { g = mermiYap(tur); g.position.set(x, 1.15, z); scene.add(g); mermiMap.set(id, g); g.userData.tur = tur; }
      g.userData.hx = x; g.userData.hz = z; g.rotation.y = yon;
    });
    mermiMap.forEach((g, id) => { if (!var_.has(id)) { at(g); mermiMap.delete(id); } });
  }
  function mermiPatla(x, z, tur) {
    const renk = tur === 'domates' ? 0xe8302a : tur === 'ates' ? 0xff8a1a : tur === 'ok' ? 0xc8a070 : tur === 'su' ? 0x5ab4ff : tur === 'terlik' ? 0x3ab4e8 : 0x9a9a9a;
    partikul(x, 1.1, z, renk, tur === 'ates' ? 18 : 8, tur === 'ates' ? 4 : 2.5);
  }

  // ---------- Çizim döngüsü ----------
  let sonT = performance.now();
  function ciz() {
    const simdi = performance.now(), dt = Math.min(0.05, (simdi - sonT) / 1000); sonT = simdi;
    kameraGuncelle(dt);
    // parçacıklar
    for (let i = parcalar.length - 1; i >= 0; i--) {
      const p = parcalar[i], u = p.userData; u.t += dt;
      u.vy -= 9 * dt; p.position.x += u.vx * dt; p.position.y = Math.max(0.05, p.position.y + u.vy * dt); p.position.z += u.vz * dt;
      p.scale.setScalar(Math.max(0.01, 1 - u.t / u.omur));
      if (u.t >= u.omur) { scene.remove(p); parcalar.splice(i, 1); }
    }
    for (let i = sayilar.length - 1; i >= 0; i--) {
      const s = sayilar[i], u = s.userData; u.t += dt;
      s.position.y += u.vy * dt; u.vy *= 0.96; s.material.opacity = Math.max(0, 1 - Math.max(0, u.t - 0.5) / 0.5);
      if (u.t > 1) { scene.remove(s); s.material.map.dispose(); s.material.dispose(); sayilar.splice(i, 1); }
    }
    (arenaGrup?.userData.alevler || []).forEach((a, i) => { a.scale.set(1 + Math.sin(simdi / 90 + i) * 0.15, 1.6 + Math.sin(simdi / 70 + i * 2) * 0.3, 1); });
    guclerMap.forEach(g => { g.userData.faz += dt * 3; g.userData.s.position.y = 0.9 + Math.sin(g.userData.faz) * 0.15; });
    mermiMap.forEach(g => { const u = g.userData; if (u.hx === undefined) return; g.position.x += (u.hx - g.position.x) * Math.min(1, dt * 18); g.position.z += (u.hz - g.position.z) * Math.min(1, dt * 18); if (u.tur !== 'ok') g.rotation.x += dt * 10; });
    // seyirciler zıplar
    const sy = arenaGrup?.userData.seyirci;
    if (sy && seyirciCosku > 0) {
      seyirciCosku = Math.max(0, seyirciCosku - dt * 0.4);
      const { m4, s1, q, ax, v } = gecici;
      sy.liste.forEach((p, i) => {
        p.faz += dt * 9;
        const z = Math.max(0, Math.sin(p.faz)) * 0.25 * Math.min(1, seyirciCosku);
        q.setFromAxisAngle(ax, Math.atan2(p.x, p.z) + Math.PI);
        m4.compose(v.set(p.x, p.y + 0.3 + z, p.z), q, s1); sy.gI.setMatrixAt(i, m4);
        m4.compose(v.set(p.x, p.y + 0.75 + z, p.z), q, s1); sy.bI.setMatrixAt(i, m4);
      });
      sy.gI.instanceMatrix.needsUpdate = true; sy.bI.instanceMatrix.needsUpdate = true;
    }
    renderer.render(scene, camera);
    return dt;
  }
  let seyirciCosku = 0;
  const gecici = { m4: new THREE.Matrix4(), s1: new THREE.Vector3(1, 1, 1), q: new THREE.Quaternion(), ax: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3() };
  function cosku(k) { seyirciCosku = Math.max(seyirciCosku, k); }

  return {
    kur, arenaKur, alanGuncelle, at, paylas, yorunge, yorungeAl, elle, kameraSifirla, metinSprite, sars, zemindeNokta, etiketYap, etiketCiz, partikul, sayiGoster, emojiSprite,
    gucleriCiz, gucleriTemizle, mermileriCiz, mermiPatla, ciz, cosku, GUC_EMOJI, GUC_RENK,
    get scene() { return scene; }, get camera() { return camera; }, get bellek() { return renderer.info.memory; },
  };
})();
