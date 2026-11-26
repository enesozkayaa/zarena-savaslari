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

  // durum: 0 yürü, 1 alev hazırlık, 2 alev, 3 ısırık hazırlık, 4 kuyruk hazırlık, 5 öldü; hiz: 0..1 yürüme
  function guncelle(g, durum, hiz, dt, kacti) {
    const u = g.userData; u.t += dt;
    const t = u.t;
    if (durum === 5) {   // devrilir
      u.olum = Math.min(1, u.olum + dt * 0.8);
      g.rotation.z = u.olum * 1.4; g.position.y = -u.olum * 0.5;
      u.alev.visible = false; u.uyari.material.opacity = 0; u.agizIsik.material.opacity = 0;
      u.kanatlar.forEach((k, i) => { k.rotation.z = (i ? -1 : 1) * 0.6; });
      return;
    }
    if (kacti) { u.kacis += dt; g.position.y = u.kacis * u.kacis * 3; }
    const kanatHiz = kacti ? 14 : durum === 1 ? 6 : 2.2;
    u.kanatlar.forEach((k, i) => { k.rotation.z = (i ? -1 : 1) * (0.25 + Math.sin(t * kanatHiz) * (kacti ? 0.7 : 0.25)); });
    // yürüme
    u.bacaklar.forEach((b, i) => { b.rotation.x = Math.sin(t * 6 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.45 * hiz; });
    u.govde.position.y = Math.abs(Math.sin(t * 6)) * 0.08 * hiz;
    // kuyruk sallanır; savururken hızla yana döner
    const savur = durum === 4 ? Math.sin(Math.min(1, (u.savurT = (u.savurT || 0) + dt) / 0.7) * Math.PI) * 1.2 : (u.savurT = 0, 0);
    u.kuyrukParca.forEach((p, i) => { p.rotation.y = Math.sin(t * 1.6 - i * 0.6) * 0.12 + savur * 0.35; });
    // kafa ve çene
    const acik = durum === 1 ? 0.35 : durum === 2 ? 0.6 : durum === 3 ? 0.7 : 0.08 + Math.sin(t * 1.3) * 0.04;
    u.cene.rotation.x += (acik - u.cene.rotation.x) * Math.min(1, dt * 10);
    const egil = durum === 2 ? 0.35 : durum === 3 ? 0.45 : durum === 1 ? -0.15 : Math.sin(t * 1.1) * 0.05;
    u.boyun.rotation.x += (egil - u.boyun.rotation.x) * Math.min(1, dt * 6);
    // alev
    u.agizIsik.material.opacity = durum === 1 ? 0.5 + Math.sin(t * 20) * 0.3 : durum === 2 ? 0.9 : 0;
    u.uyari.material.opacity = durum === 1 ? 0.2 + Math.abs(Math.sin(t * 9)) * 0.25 : durum === 2 ? 0.18 : 0;
    u.alev.visible = durum === 2;
    if (durum === 2) u.alevParca.forEach((m, i) => { m.scale.set(1 + Math.sin(t * 30 + i) * 0.08, 1 + Math.sin(t * 23 + i) * 0.06, 1); m.material.opacity = (i ? 0.7 : 0.55) * (0.85 + Math.sin(t * 40 + i) * 0.15); });
  }
  // Alev parçacıkları için dünya koordinatında ağız ucu ve yön
  function agiz(g) { const y = g.rotation.y; return { x: g.position.x + Math.sin(y) * 2.4, z: g.position.z + Math.cos(y) * 2.4, yon: y }; }
  // Kafanın dünyadaki yeri (hasar sayıları için)
  function kafaNoktasi(g) { const v = new THREE.Vector3(); g.userData.kafa.getWorldPosition(v); return v; }

  return { yap, guncelle, agiz, kafaNoktasi };
})();
