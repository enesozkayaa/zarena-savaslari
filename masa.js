// =============================================================
// Zarena Savaşları - EŞYA SEÇİM MASASI (3D)
// Oyuncular masanın arkasında durur. Herkes zarını kendi önüne atar, zarlar yuvarlanıp durur.
// Sonra eşyalar masada (tahta mankenlerde / ayaklıklarda) belirir. Seçilen eşya uçup sahibine gider.
// =============================================================

const Masa = (() => {
  const MASA_Y = 0.92;
  let grup = null, n = 0, W = 4, D = 1.6;
  const yerler = [];             // oyuncu duruş yerleri
  const zarlar = new Map();      // no → { m, t, bas, son, ... }
  let esyalar = [];              // [{ g, i, id, t0, alindi, ucus }]
  let uyari = null;

  // ---------- Zar modeli (6 yüzü noktalı, oyuncu renginde) ----------
  const DEGER_YUZ = [3, 4, 1, 6, 2, 5];   // BoxGeometry yüz sırası: +x, -x, +y, -y, +z, -z
  const NOKTA = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  const dokuCache = new Map();
  function yuzDoku(v, renk) {
    const k = v + '|' + renk;
    if (dokuCache.has(k)) return dokuCache.get(k);
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = renk; g.lineWidth = 14; g.strokeRect(7, 7, 114, 114);
    g.fillStyle = v === 1 ? '#d8202a' : '#1a1a1a';
    NOKTA[v].forEach(([x, y]) => { g.beginPath(); g.arc(64 + x * 30, 64 + y * 30, v === 1 ? 17 : 12, 0, 7); g.fill(); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    dokuCache.set(k, t); return t;
  }
  function zarYap(renkHex) {
    const css = '#' + renkHex.toString(16).padStart(6, '0');
    const mats = DEGER_YUZ.map(v => new THREE.MeshStandardMaterial({ map: yuzDoku(v, css), roughness: 0.4 }));
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mats);
    m.castShadow = true;
    return m;
  }
  // Değer v üstte kalacak dönüş
  function ustteDonus(v, yaw) {
    const q = new THREE.Quaternion(), e = new THREE.Euler();
    if (v === 1) e.set(0, 0, 0); else if (v === 6) e.set(Math.PI, 0, 0);
    else if (v === 2) e.set(-Math.PI / 2, 0, 0); else if (v === 5) e.set(Math.PI / 2, 0, 0);
    else if (v === 3) e.set(0, 0, Math.PI / 2); else if (v === 4) e.set(0, 0, -Math.PI / 2);
    q.setFromEuler(e);
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw).multiply(q);
  }

  // ---------- Masa ----------
  function kur(oyuncuSayisi) {
    temizle();
    n = oyuncuSayisi;
    const sut = n <= 5 ? n : Math.ceil(n / 2), sat = Math.ceil(n / sut);
    W = Math.max(3.4, sut * 1.3 + 1.0); D = sat === 1 ? 1.9 : 2.7;
    grup = new THREE.Group(); Sahne.scene.add(grup);
    const tahta = new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: 0.7 });
    const koyu = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.8 });
    const ust = new THREE.Mesh(new THREE.BoxGeometry(W, 0.1, D), tahta); ust.position.y = MASA_Y - 0.05; ust.castShadow = ust.receiveShadow = true; grup.add(ust);
    const kenar = new THREE.Mesh(new THREE.BoxGeometry(W + 0.12, 0.06, D + 0.12), koyu); kenar.position.y = MASA_Y - 0.12; grup.add(kenar);
    // kırmızı kadife örtü
    const ortu = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, 0.012, D - 0.3), new THREE.MeshStandardMaterial({ color: 0x8a1a1a, roughness: 1 }));
    ortu.position.y = MASA_Y + 0.006; ortu.receiveShadow = true; grup.add(ortu);
    const serit = new THREE.Mesh(new THREE.BoxGeometry(W - 0.26, 0.013, 0.04), new THREE.MeshStandardMaterial({ color: 0xd8a830, metalness: 0.6, roughness: 0.4 }));
    [-1, 1].forEach(s => { const k = serit.clone(); k.position.set(0, MASA_Y + 0.007, s * (D / 2 - 0.17)); grup.add(k); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { const ayak = new THREE.Mesh(new THREE.BoxGeometry(0.14, MASA_Y - 0.1, 0.14), koyu); ayak.position.set(a * (W / 2 - 0.15), (MASA_Y - 0.1) / 2, b * (D / 2 - 0.15)); ayak.castShadow = true; grup.add(ayak); });
    // Oyuncuların duruş yerleri: masanın arkasında yay şeklinde
    yerler.length = 0;
    const ara = 1.25;
    let r = D / 2 + 1.1;
    let adim = ara / r;
    while (adim * (n - 1) > Math.PI * 1.15) { r += 0.3; adim = ara / r; }
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i - (n - 1) / 2) * adim;
      // masanın arka kenarına göre: yayı masanın merkezine göre kur, sonra en az arka kenarın 0.8 m gerisinde tut
      let x = Math.sin(a) * r * Math.max(1, W / 2 / r + 0.2), z = Math.cos(a) * r;
      if (Math.abs(x) < W / 2 + 0.4) z = Math.min(z, -D / 2 - 0.75);
      yerler.push({ x, z, yon: Math.atan2(-x, -z) });
    }
  }
  function temizle() {
    if (grup) Sahne.scene.remove(grup);
    zarlar.forEach(z => { Sahne.scene.remove(z.m); if (z.et) Sahne.scene.remove(z.et); }); zarlar.clear();
    esyalar.forEach(e => Sahne.scene.remove(e.g)); esyalar = [];
    grup = null;
  }
  const yer = no => yerler[no] || { x: 0, z: -2, yon: 0 };
  const masaKenar = () => ({ W, D, y: MASA_Y });

  // ---------- Zarlar ----------
  function zarAt(no, v, renk, hemen) {
    const eski = zarlar.get(no); if (eski) { Sahne.scene.remove(eski.m); if (eski.et) Sahne.scene.remove(eski.et); }
    const m = zarYap(renk); Sahne.scene.add(m);
    const p = yer(no);
    // oyuncunun önünde, masanın üstünde bir yer
    const dx = -p.x, dz = -p.z, L = Math.hypot(dx, dz) || 1;
    let hx = p.x + dx / L * (Math.hypot(p.x, p.z) - Math.max(0.2, Math.min(Math.hypot(p.x, p.z), D / 2)) + 0.55);
    let hz = p.z + dz / L * (Math.hypot(p.x, p.z) - Math.max(0.2, Math.min(Math.hypot(p.x, p.z), D / 2)) + 0.55);
    hx = Math.max(-W / 2 + 0.3, Math.min(W / 2 - 0.3, p.x * 0.85)); hz = Math.max(-D / 2 + 0.3, Math.min(-D / 2 + 0.7, hz));
    hx += (Math.random() - 0.5) * 0.15;
    const bas = new THREE.Vector3(p.x + dx / L * 0.4, 1.55, p.z + dz / L * 0.4);
    const son = new THREE.Vector3(hx, MASA_Y + 0.15, hz);
    const eksen = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const z = { m, v, bas, son, eksen, t: hemen ? 9 : -0.25, hedefQ: ustteDonus(v, Math.random() * Math.PI * 2), sure: 1.15, dondu: 7 + Math.random() * 4, et: null, ses: !hemen };
    m.position.copy(hemen ? son : bas);
    if (hemen) m.quaternion.copy(z.hedefQ);
    m.visible = !!hemen;
    zarlar.set(no, z);
    return z;
  }
  function zarKaldir(nolar) {
    nolar.forEach(no => { const z = zarlar.get(no); if (!z) return; z.kalkis = 0; });
  }
  function zarlariTopla() { zarlar.forEach(z => { z.kalkis = z.kalkis ?? 0; }); }
  function siraGoster(sira) {
    sira.forEach((no, k) => {
      const z = zarlar.get(no); if (!z) return;
      if (z.et) Sahne.scene.remove(z.et);
      z.et = Sahne.metinSprite(`${k + 1}.`, k === 0 ? '#ffd860' : '#fff', 0.26);
      z.et.position.copy(z.son).add(new THREE.Vector3(0, 0.38, 0)); Sahne.scene.add(z.et);
    });
  }

  // ---------- Eşyalar ----------
  function esyalariCikar(idler, alinan, hemen) {
    esyalar.forEach(e => Sahne.scene.remove(e.g)); esyalar = [];
    idler.forEach((id, i) => {
      if (alinan && alinan[i] !== undefined) { esyalar.push({ g: new THREE.Group(), i, id, alindi: true, bitti: true }); return; }
      const x = Esya.al(id), y = Motor.esyaYeri(i, idler.length);
      const g = new THREE.Group(); g.position.set(y.x, MASA_Y, y.z);
      // Kaide: iyiliğine göre renkli halka (altın = efsane)
      const renk = x.p >= 8 ? 0xffc21a : x.p >= 5 ? 0x5aa8ff : x.p >= 3 ? 0xb8b8b8 : 0x8a6a4a;
      const kaide = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 28), new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.6 }));
      kaide.position.y = 0.03; kaide.receiveShadow = true; g.add(kaide);
      const halka = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.025, 6, 32), new THREE.MeshStandardMaterial({ color: renk, emissive: renk, emissiveIntensity: x.p >= 8 ? 0.8 : 0.35, metalness: 0.5, roughness: 0.3 }));
      halka.rotation.x = Math.PI / 2; halka.position.y = 0.06; g.add(halka);
      if (x.p >= 8) { const isik = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.4, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd860, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false })); isik.position.y = 0.75; g.add(isik); }
      const model = Insan.vitrin(id); model.position.y = 0.06; model.scale.multiplyScalar(1.35); g.add(model);
      const et = Sahne.metinSprite(x.ad, x.p >= 8 ? '#ffd860' : '#ffffff', 0.2); et.position.y = 1.55; g.add(et);
      g.userData = { model, halka, et, i };
      g.scale.setScalar(hemen ? 1 : 0.001);
      Sahne.scene.add(g);
      esyalar.push({ g, i, id, t0: hemen ? 9 : -i * 0.18, alindi: false, model, et });
    });
  }
  function esyaUcur(i, no, bitince) {
    const e = esyalar.find(x => x.i === i); if (!e || e.alindi) { bitince && bitince(); return; }
    e.alindi = true;
    e.et.visible = false;
    const p = yer(no);
    e.ucus = { t: 0, bas: e.g.position.clone(), son: new THREE.Vector3(p.x, 1.2, p.z), bitince };
  }
  function vurgula(i) { esyalar.forEach(e => { e.vurgu = e.i === i && !e.alindi; }); }
  // Ekrandaki noktada hangi eşya var?
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function esyaBul(cx, cy) {
    v2.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(v2, Sahne.camera);
    let en = -1, enD = 1e9;
    esyalar.forEach(e => {
      if (e.alindi || !e.g.parent) return;
      const kutu = new THREE.Box3().setFromObject(e.g.userData.model).expandByScalar(0.08);
      kutu.min.y = Math.min(kutu.min.y, MASA_Y);
      const h = ray.ray.intersectBox(kutu, new THREE.Vector3());
      if (h) { const d = h.distanceTo(ray.ray.origin); if (d < enD) { enD = d; en = e.i; } }
    });
    return en;
  }
  // Ekrandaki noktanın masa yüzeyindeki yeri (imleçler için)
  const duzlem = new THREE.Plane(new THREE.Vector3(0, 1, 0), -MASA_Y), v3 = new THREE.Vector3();
  function masadaNokta(cx, cy) {
    v2.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(v2, Sahne.camera);
    return ray.ray.intersectPlane(duzlem, v3) ? { x: v3.x, z: v3.z } : null;
  }
  function ekranda(x, z) {
    const v = new THREE.Vector3(x, MASA_Y + 0.05, z).project(Sahne.camera);
    return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, onde: v.z < 1 };
  }

  // ---------- Her kare ----------
  function guncelle(dt, sesler) {
    zarlar.forEach((z, no) => {
      if (z.kalkis !== undefined) {   // masadan kalkıyor
        z.kalkis += dt;
        z.m.scale.setScalar(Math.max(0.01, 1 - z.kalkis * 2.5)); z.m.position.y += dt * 0.6;
        if (z.et) z.et.visible = false;
        if (z.kalkis > 0.4) { Sahne.scene.remove(z.m); if (z.et) Sahne.scene.remove(z.et); zarlar.delete(no); }
        return;
      }
      if (z.t >= z.sure + 0.5) return;
      z.t += dt;
      if (z.t < 0) return;   // el kalkıyor
      z.m.visible = true;
      const t = Math.min(1, z.t / z.sure);
      // fırlatma: yay çizer, sonra iki kez seker
      let y, k;
      if (t < 0.6) { k = t / 0.6; y = z.bas.y + (z.son.y - z.bas.y) * k + Math.sin(k * Math.PI) * 0.7; }
      else if (t < 0.85) { const u = (t - 0.6) / 0.25; k = 1; y = z.son.y + Math.sin(u * Math.PI) * 0.22; }
      else { const u = (t - 0.85) / 0.15; k = 1; y = z.son.y + Math.sin(u * Math.PI) * 0.06; }
      const yatay = Math.min(1, t / 0.6) * 0.82 + Math.max(0, (t - 0.6) / 0.4) * 0.18;
      z.m.position.set(z.bas.x + (z.son.x - z.bas.x) * yatay, y, z.bas.z + (z.son.z - z.bas.z) * yatay);
      const kalan = Math.pow(1 - t, 2) * z.dondu * Math.PI;
      z.m.quaternion.copy(z.hedefQ).multiply(new THREE.Quaternion().setFromAxisAngle(z.eksen, kalan));
      if (z.ses && t >= 0.6 && !z.ses1) { z.ses1 = true; sesler.zarDus(); }
      if (z.ses && t >= 0.85 && !z.ses2) { z.ses2 = true; sesler.zarTik(); }
      if (t >= 1 && !z.durdu) { z.durdu = true; z.m.position.copy(z.son); z.m.quaternion.copy(z.hedefQ); }
    });
    const zaman = performance.now() / 1000;
    esyalar.forEach(e => {
      if (e.bitti) return;
      if (e.ucus) {
        const u = e.ucus; u.t += dt;
        const k = Math.min(1, u.t / 0.75), s = k * k * (3 - 2 * k);
        e.g.position.lerpVectors(u.bas, u.son, s); e.g.position.y += Math.sin(k * Math.PI) * 1.2;
        e.g.scale.setScalar(1 - k * 0.6); e.g.rotation.y += dt * 9;
        if (k >= 1) { e.bitti = true; Sahne.scene.remove(e.g); Sahne.partikul(u.son.x, u.son.y, u.son.z, 0xffd860, 14, 2.5); u.bitince && u.bitince(); }
        return;
      }
      e.t0 += dt;
      if (e.t0 < 0) return;
      const k = Math.min(1, e.t0 / 0.45);
      const yay = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.25 : 1;
      e.g.scale.setScalar(Math.max(0.001, k * yay * (e.vurgu ? 1.12 : 1)));
      if (k < 1 && !e.cikti) { e.cikti = true; Sahne.partikul(e.g.position.x, MASA_Y + 0.3, e.g.position.z, 0xffe8a0, 8, 1.6); sesler.cik(); }
      e.model.rotation.y = Math.sin(zaman * 0.8 + e.i) * 0.6 + (e.vurgu ? zaman * 2 : 0);
      e.g.userData.halka.material.emissiveIntensity = e.vurgu ? 1.4 : (Esya.al(e.id).p >= 8 ? 0.8 : 0.35);
    });
  }

  return { kur, temizle, yer, zarAt, zarKaldir, zarlariTopla, siraGoster, esyalariCikar, esyaUcur, vurgula, esyaBul, masadaNokta, ekranda, guncelle, masaKenar, get zarSay() { return zarlar.size; }, MASA_Y };
})();
