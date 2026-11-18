// =============================================================
// Zarena Savaşları - İNSAN KARAKTER ve üstüne giyilen eşyaların görünüşü
// Karakter +z yönüne bakar. Kolların ve bacakların dönme noktası omuz ve kalçadır.
// Silah sağ ele, kalkan sol ele takılır.
// =============================================================

const Insan = (() => {
  const TENLER = [0xf2c9a0, 0xe0ac7e, 0xc48a5a, 0x8d5a34, 0xffdbc2];
  const RENKLER = [0xe8483a, 0x2f7de0, 0x3fbf4a, 0xffc21a, 0xa04ae0, 0xff7ab8, 0x1ac8c8, 0xff8a1a, 0x8a5a2a, 0xf4f4f4];
  const RENK_AD = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Pembe', 'Turkuaz', 'Turuncu', 'Kahve', 'Beyaz'];
  const mat = new Map();
  function M(renk, ops = {}) {
    const k = renk + JSON.stringify(ops);
    if (!mat.has(k)) mat.set(k, new THREE.MeshStandardMaterial({ color: renk, roughness: ops.metal ? 0.35 : 0.75, metalness: ops.metal ? 0.7 : 0, emissive: ops.isik ? renk : 0x000000, emissiveIntensity: ops.isik ? 0.8 : 0, transparent: !!ops.saydam, opacity: ops.saydam || 1 }));
    return mat.get(k);
  }
  const metalMi = r => [0x9aa4ae, 0xc8ced6, 0x8a929c, 0xa8aeb6, 0xd8dee6, 0x6a6f78, 0x5a5f66].includes(r);
  function kutu(w, h, d, renk, x = 0, y = 0, z = 0, ops) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(renk, ops ?? { metal: metalMi(renk) }));
    m.position.set(x, y, z); m.castShadow = true; return m;
  }
  function silindir(r1, r2, h, renk, x = 0, y = 0, z = 0, ops, seg = 14) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), M(renk, ops ?? { metal: metalMi(renk) }));
    m.position.set(x, y, z); m.castShadow = true; return m;
  }
  function kure(r, renk, x = 0, y = 0, z = 0, ops, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), M(renk, ops ?? { metal: metalMi(renk) }));
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; return m;
  }
  const grup = (...c) => { const g = new THREE.Group(); c.forEach(x => x && g.add(x)); return g; };

  // ---------- Gövde iskeleti ----------
  function yap(renkNo, tenNo) {
    const ten = TENLER[tenNo % TENLER.length], renk = RENKLER[renkNo % RENKLER.length];
    const g = new THREE.Group();
    const govde = new THREE.Group(); g.add(govde);          // bütün beden (ölünce bu yatar)
    const ud = { govde, ten, renk, yuva: {}, faz: 0, saldiriT: 9, saldiriTur: 'yakin', blk: 0, oluT: 0 };
    g.userData = ud;
    // Bacaklar
    ud.bacak = [-1, 1].map(s => {
      const b = new THREE.Group(); b.position.set(0.13 * s, 0.9, 0);
      b.add(kutu(0.17, 0.82, 0.19, ten, 0, -0.43, 0, {}));
      const ayak = new THREE.Group(); ayak.position.set(0, -0.86, 0.04); b.add(ayak);
      ayak.add(kutu(0.17, 0.08, 0.28, ten, 0, 0, 0.02, {}));
      b.userData.ayak = ayak;
      govde.add(b); return b;
    });
    // Don (oyuncunun rengi)
    govde.add(kutu(0.46, 0.2, 0.26, renk, 0, 0.9, 0, {}));
    // Gövde (çıplak)
    ud.beden = kutu(0.46, 0.58, 0.25, ten, 0, 1.25, 0, {});
    govde.add(ud.beden);
    // göbek deliği + göğüs ucu (komik çıplaklık)
    govde.add(kutu(0.03, 0.03, 0.01, 0x8a5a3a, 0, 1.08, 0.126, {}));
    // Kollar
    ud.kol = [-1, 1].map(s => {
      const k = new THREE.Group(); k.position.set(0.31 * s, 1.5, 0);
      k.add(kutu(0.13, 0.6, 0.13, ten, 0, -0.3, 0, {}));
      const el = new THREE.Group(); el.position.set(0, -0.62, 0); k.add(el);
      el.add(kure(0.08, ten, 0, 0, 0, {}));
      k.userData.el = el;
      govde.add(k); return k;
    });
    // Baş
    const bas = new THREE.Group(); bas.position.set(0, 1.74, 0); govde.add(bas); ud.bas = bas;
    bas.add(kutu(0.34, 0.34, 0.32, ten, 0, 0, 0, {}));
    bas.add(kutu(0.05, 0.06, 0.02, 0x111111, -0.08, 0.04, 0.16, {}));
    bas.add(kutu(0.05, 0.06, 0.02, 0x111111, 0.08, 0.04, 0.16, {}));
    bas.add(kutu(0.12, 0.025, 0.02, 0x8a3a2a, 0, -0.09, 0.16, {}));
    bas.add(kutu(0.36, 0.08, 0.34, 0x3a2414 + tenNo * 0x050302, 0, 0.17, -0.01, {}));   // saç
    // Ayak altında renkli halka
    const halka = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 28), new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0.85 }));
    halka.rotation.x = -Math.PI / 2; halka.position.y = 0.02; g.add(halka); ud.halka = halka;
    ud.kol[0].rotation.x = -0.15; ud.kol[1].rotation.x = -0.15;
    return g;
  }

  // ---------- Eşyalar ----------
  function kafaYap(x) {
    const r = x.renk, g = new THREE.Group();
    switch (x.sekil) {
      case 'koni': g.add(silindir(0.001, 0.13, 0.32, r, 0, 0.32, 0, {})); g.add(kure(0.035, 0xffee55, 0, 0.49, 0, {})); break;
      case 'asci': g.add(silindir(0.2, 0.17, 0.12, r, 0, 0.2, 0, {})); g.add(kure(0.22, r, 0, 0.35, 0, {}, 1, 0.7, 1)); break;
      case 'tavuk': g.add(kutu(0.38, 0.38, 0.36, r, 0, 0.02, 0, {})); g.add(kutu(0.04, 0.12, 0.16, 0xe8202a, 0, 0.26, 0.02, {})); g.add(kutu(0.1, 0.06, 0.12, 0xffa020, 0, 0, 0.23, {})); g.add(kutu(0.05, 0.05, 0.02, 0x111111, -0.09, 0.07, 0.19, {})); g.add(kutu(0.05, 0.05, 0.02, 0x111111, 0.09, 0.07, 0.19, {})); break;
      case 'kova': g.add(silindir(0.2, 0.17, 0.26, r, 0, 0.13, 0)); g.add(new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 16, Math.PI), M(0x666666, { metal: true }))); g.children[1].position.y = 0.26; break;
      case 'bere': g.add(kure(0.19, r, 0, 0.1, 0, {}, 1, 0.75, 1)); g.add(kure(0.06, 0xffffff, 0, 0.27, 0, {})); break;
      case 'kovboy': g.add(silindir(0.34, 0.34, 0.03, r, 0, 0.16, 0, {})); g.add(silindir(0.15, 0.18, 0.2, r, 0, 0.27, 0, {})); g.add(silindir(0.185, 0.185, 0.04, 0x2a1a0a, 0, 0.2, 0, {})); break;
      case 'kask': g.add(kure(0.2, r, 0, 0.06, 0, {}, 1, 0.85, 1.05)); break;
      case 'bant': g.add(kutu(0.36, 0.06, 0.34, r, 0, 0.1, 0, {})); g.add(kutu(0.04, 0.2, 0.03, r, 0.06, 0.02, -0.19, {})); g.add(kutu(0.04, 0.2, 0.03, r, -0.04, 0.0, -0.19, {})); break;
      case 'viking': g.add(kure(0.2, r, 0, 0.06, 0, undefined, 1, 0.85, 1.05)); [-1, 1].forEach(s => { const b = silindir(0.001, 0.05, 0.22, 0xf4ecd8, 0.22 * s, 0.17, 0, {}); b.rotation.z = -0.9 * s; g.add(b); }); break;
      case 'tac': g.add(silindir(0.17, 0.17, 0.08, r, 0, 0.2, 0, { metal: true })); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(silindir(0.001, 0.03, 0.09, r, Math.sin(a) * 0.16, 0.28, Math.cos(a) * 0.16, { metal: true })); } g.add(kure(0.03, 0xe82a5a, 0, 0.2, 0.17, {})); break;
      case 'sovalye': g.add(kutu(0.39, 0.42, 0.38, r, 0, 0.03, 0)); g.add(kutu(0.3, 0.03, 0.02, 0x111111, 0, 0.05, 0.195, {})); g.add(kutu(0.04, 0.12, 0.25, 0xd8302a, 0, 0.29, 0, {})); break;
      case 'ejderkafa': g.add(kutu(0.4, 0.3, 0.42, r, 0, 0.12, 0.02, {})); g.add(kutu(0.3, 0.06, 0.1, 0xf4ecd8, 0, -0.03, 0.2, {})); [-1, 1].forEach(s => { const b = silindir(0.001, 0.05, 0.26, 0xf4ecd8, 0.15 * s, 0.32, -0.08, {}); b.rotation.x = -0.6; g.add(b); }); break;
      default: g.add(kure(0.2, r, 0, 0.08, 0, {}, 1, 0.8, 1));
    }
    return g;
  }
  function govdeYap(x, ud) {
    const r = x.renk, g = new THREE.Group(), o = { metal: metalMi(r) };
    const kollu = (uzun, renk = r) => ud.kol.forEach(k => { const m = kutu(0.16, uzun ? 0.5 : 0.24, 0.16, renk, 0, uzun ? -0.25 : -0.12, 0, o); k.add(m); g.userData.kollar = (g.userData.kollar || []).concat(m); });
    const ana = () => g.add(kutu(0.5, 0.6, 0.29, r, 0, 1.25, 0, o));
    switch (x.sekil) {
      case 'kutu': g.add(kutu(0.7, 0.66, 0.46, r, 0, 1.22, 0, {})); g.add(kutu(0.4, 0.02, 0.01, 0x8a5a2a, 0, 1.4, 0.235, {})); break;
      case 'atlet': g.add(kutu(0.48, 0.55, 0.27, r, 0, 1.22, 0, {})); break;
      case 'tisort': ana(); kollu(false); break;
      case 'kazak': ana(); kollu(true); g.add(kutu(0.3, 0.06, 0.3, r, 0, 1.56, 0, {})); break;
      case 'bornoz': ana(); kollu(true); g.add(kutu(0.52, 0.5, 0.31, r, 0, 0.75, 0, {})); g.add(kutu(0.52, 0.05, 0.32, 0xd8c8ff, 0, 1.0, 0, {})); break;
      case 'yelek': g.add(kutu(0.18, 0.58, 0.29, r, -0.16, 1.25, 0, {})); g.add(kutu(0.18, 0.58, 0.29, r, 0.16, 1.25, 0, {})); g.add(kutu(0.5, 0.58, 0.1, r, 0, 1.25, -0.1, {})); break;
      case 'smokin': ana(); kollu(true); g.add(kutu(0.14, 0.5, 0.01, 0xffffff, 0, 1.26, 0.146, {})); g.add(kutu(0.14, 0.05, 0.03, 0xd8202a, 0, 1.49, 0.16, {})); break;
      case 'fici': g.add(silindir(0.36, 0.36, 0.7, r, 0, 1.18, 0, {}, 16)); [0.92, 1.18, 1.44].forEach(y => g.add(silindir(0.375, 0.375, 0.05, 0x5a5f66, 0, y, 0, { metal: true }, 16))); break;
      case 'zirh': ana(); kollu(true); g.add(kutu(0.52, 0.06, 0.31, 0x6a4a2a, 0, 1.0, 0, {})); break;
      case 'plaka': ana(); kollu(true); [-1, 1].forEach(s => g.add(kure(0.14, r, 0.3 * s, 1.5, 0, o, 1, 0.6, 1))); g.add(kutu(0.3, 0.3, 0.02, r === 0x2e9a5a ? 0x8ae0aa : 0xe8ecf0, 0, 1.3, 0.15, o)); break;
      default: ana();
    }
    return g;
  }
  function bacakYap(x, ud) {
    const r = x.renk, g = new THREE.Group(), parca = [], o = { metal: metalMi(r) };
    const bacaga = (uzun) => ud.bacak.forEach(b => { const m = kutu(0.2, uzun ? 0.8 : 0.34, 0.22, r, 0, uzun ? -0.4 : -0.17, 0, o); b.add(m); parca.push(m); });
    switch (x.sekil) {
      case 'pantolon': bacaga(true); g.add(kutu(0.48, 0.22, 0.28, r, 0, 0.9, 0, o)); break;
      case 'sort': bacaga(false); g.add(kutu(0.48, 0.22, 0.28, r, 0, 0.9, 0, o)); break;
      case 'etek': g.add(silindir(0.26, 0.34, 0.42, r, 0, 0.75, 0, {}, 12)); break;
      case 'tutu': g.add(silindir(0.45, 0.45, 0.05, r, 0, 0.88, 0, {}, 18)); g.add(silindir(0.4, 0.4, 0.05, 0xffd0ea, 0, 0.84, 0, {}, 18)); break;
    }
    g.userData.parca = parca;
    return g;
  }
  function ayakYap(x, ud) {
    const r = x.renk, parca = [];
    ud.bacak.forEach(b => {
      const a = b.userData.ayak, g = new THREE.Group(); a.add(g); parca.push(g);
      switch (x.sekil) {
        case 'terlik': g.add(kutu(0.2, 0.04, 0.32, r, 0, -0.04, 0.03, {})); break;
        case 'palet': g.add(kutu(0.26, 0.03, 0.6, r, 0, -0.04, 0.18, {})); break;
        case 'topuk': g.add(kutu(0.19, 0.08, 0.3, r, 0, 0.01, 0.03, {})); g.add(kutu(0.05, 0.12, 0.05, r, 0, -0.08, -0.1, {})); break;
        case 'tavsan': g.add(kure(0.15, r, 0, 0.02, 0.04, {}, 1, 0.7, 1.3)); [-1, 1].forEach(s => g.add(kutu(0.04, 0.16, 0.03, r, 0.05 * s, 0.14, 0.16, {}))); break;
        case 'cizme': g.add(kutu(0.21, 0.11, 0.32, r, 0, 0.01, 0.03)); g.add(kutu(0.21, 0.3, 0.22, r, 0, 0.18, 0)); break;
        case 'spor': g.add(kutu(0.2, 0.11, 0.32, r, 0, 0.01, 0.03, {})); g.add(kutu(0.21, 0.03, 0.33, 0xe8483a, 0, -0.04, 0.03, {})); break;
        case 'paten': g.add(kutu(0.2, 0.18, 0.32, r, 0, 0.04, 0.03, {})); [-0.1, 0.0, 0.1, 0.18].forEach(z => g.add(silindir(0.04, 0.04, 0.04, 0x222222, 0, -0.08, z, {}, 8))); g.children.slice(1).forEach(c => { c.rotation.z = Math.PI / 2; }); break;
        case 'kanatli': g.add(kutu(0.19, 0.06, 0.3, r, 0, -0.02, 0.03, { metal: true })); [-1, 1].forEach(s => { const k = kutu(0.02, 0.12, 0.18, 0xffffff, 0.12 * s, 0.08, -0.05, {}); k.rotation.z = 0.4 * s; g.add(k); }); break;
        default: g.add(kutu(0.2, 0.1, 0.32, r, 0, 0, 0.03, {}));
      }
    });
    return parca;
  }
  // Silah +y yönüne uzanır; ele takılınca ileri bakar
  function silahYap(x) {
    const r = x.renk, g = new THREE.Group(), sap = 0x6a4424;
    switch (x.sekil) {
      case 'tuy': g.add(silindir(0.02, 0.02, 0.5, 0x3a2414, 0, 0.2, 0, {})); g.add(kure(0.14, r, 0, 0.55, 0, {}, 1, 1.4, 1)); break;
      case 'balik': g.add(kure(0.12, r, 0, 0.35, 0, {}, 0.6, 2.2, 1)); g.add(kutu(0.02, 0.14, 0.18, r, 0, 0.08, 0, {})); g.add(kure(0.02, 0x111111, 0.06, 0.55, 0.05, {})); break;
      case 'supurge': g.add(silindir(0.025, 0.025, 1.3, r, 0, 0.45, 0, {})); g.add(kutu(0.3, 0.32, 0.08, 0xd8b050, 0, 1.2, 0, {})); break;
      case 'semsiye': g.add(silindir(0.02, 0.02, 1.0, 0x222222, 0, 0.35, 0, {})); g.add(silindir(0.06, 0.2, 0.7, r, 0, 0.6, 0, {}, 8)); break;
      case 'baget': g.add(silindir(0.06, 0.06, 0.9, r, 0, 0.35, 0, {}, 8)); break;
      case 'sopa': g.add(silindir(0.06, 0.03, 0.95, r, 0, 0.38, 0, {})); break;
      case 'torba': g.add(kure(0.16, 0xc8945a, 0, 0.0, 0.0, {}, 1, 0.9, 1)); g.add(kure(0.07, r, 0.05, 0.15, 0.05, {})); break;
      case 'tava': g.add(silindir(0.025, 0.025, 0.4, 0x222222, 0, 0.15, 0, {})); { const d = silindir(0.22, 0.2, 0.05, r, 0, 0.55, 0, { metal: true }); d.rotation.x = Math.PI / 2; g.add(d); } break;
      case 'sapan': g.add(silindir(0.025, 0.025, 0.3, r, 0, 0.1, 0, {})); [-1, 1].forEach(s => { const c = silindir(0.02, 0.02, 0.2, r, 0.06 * s, 0.32, 0, {}); c.rotation.z = -0.5 * s; g.add(c); }); break;
      case 'hancer': g.add(silindir(0.025, 0.025, 0.15, sap, 0, 0.04, 0, {})); g.add(kutu(0.14, 0.03, 0.04, 0x9a8a5a, 0, 0.13, 0, { metal: true })); g.add(kutu(0.06, 0.32, 0.015, r, 0, 0.3, 0, { metal: true })); break;
      case 'mizrak': g.add(silindir(0.025, 0.025, 1.8, r, 0, 0.7, 0, {})); g.add(silindir(0.001, 0.06, 0.25, 0xc8ced6, 0, 1.72, 0, { metal: true })); break;
      case 'yay': { const y = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 6, 18, Math.PI * 0.9), M(r)); y.rotation.z = Math.PI / 2 + Math.PI * 0.05; y.rotation.y = Math.PI / 2; y.position.z = -0.1; g.add(y); g.add(silindir(0.004, 0.004, 0.84, 0xffffff, 0, 0, -0.1, {})); } break;
      case 'cekic': g.add(silindir(0.03, 0.03, 1.1, sap, 0, 0.45, 0, {})); g.add(kutu(0.45, 0.28, 0.28, r, 0, 1.0, 0, { metal: true })); break;
      case 'kilic': g.add(silindir(0.025, 0.025, 0.2, sap, 0, 0.05, 0, {})); g.add(kutu(0.26, 0.04, 0.05, 0xc8a030, 0, 0.17, 0, { metal: true })); g.add(kutu(0.08, 0.85, 0.02, r, 0, 0.62, 0, { metal: true })); break;
      case 'balta': g.add(silindir(0.03, 0.03, 1.0, sap, 0, 0.4, 0, {})); g.add(kutu(0.04, 0.35, 0.3, r, 0, 0.8, 0.14, { metal: true })); break;
      case 'arbalet': g.add(kutu(0.06, 0.06, 0.55, r, 0, 0.0, 0.15, {})); g.add(kutu(0.6, 0.04, 0.04, 0x3a2414, 0, 0.02, 0.38, {})); break;
      case 'asa': g.add(silindir(0.03, 0.03, 1.3, 0x5a3a1a, 0, 0.45, 0, {})); g.add(kure(0.11, r, 0, 1.15, 0, { isik: true })); break;
      default: break;
    }
    return g;
  }
  // Kalkan: yüzü elin -y yönüne bakar (kalkan kaldırınca ileri)
  function kalkanYap(x) {
    const r = x.renk, g = new THREE.Group(), o = { metal: metalMi(r) || x.sekil === 'yuvarlak' && r === 0xe0f4ff };
    switch (x.sekil) {
      case 'kutuK': g.add(kutu(0.45, 0.05, 0.45, r, 0, -0.08, 0, {})); g.add(kutu(0.2, 0.051, 0.1, 0xd8302a, 0, -0.08, 0.1, {})); break;
      case 'yuvarlak': g.add(silindir(0.32, 0.32, 0.05, r, 0, -0.08, 0, o, 20)); g.add(silindir(0.08, 0.08, 0.07, 0x444444, 0, -0.1, 0, { metal: true })); break;
      case 'kitap': g.add(kutu(0.32, 0.1, 0.42, r, 0, -0.08, 0, {})); g.add(kutu(0.3, 0.102, 0.38, 0xf4ecd8, 0.012, -0.08, 0, {})); break;
      case 'kapi': g.add(kutu(0.6, 0.06, 1.15, r, 0, -0.1, 0.25, {})); g.add(kure(0.035, 0xffcc22, 0.22, -0.15, 0.25, { metal: true })); break;
      case 'kule': g.add(kutu(0.48, 0.06, 0.7, r, 0, -0.08, 0.08, { metal: true })); g.add(kutu(0.08, 0.07, 0.6, 0xd8302a, 0, -0.09, 0.08, {})); break;
    }
    return g;
  }

  // Kuşamı karaktere giydir (öncekileri çıkarır)
  function giydir(h, kusam) {
    const ud = h.userData, E = Esya;
    const temizle = y => {
      const v = ud.yuva[y]; if (!v) return;
      (Array.isArray(v) ? v : [v]).forEach(o => { o.parent && o.parent.remove(o); (o.userData?.kollar || []).forEach(k => k.parent && k.parent.remove(k)); (o.userData?.parca || []).forEach(k => k.parent && k.parent.remove(k)); });
      delete ud.yuva[y];
    };
    E.YUVALAR.forEach(y => {
      const id = kusam?.[y];
      if (ud.yuvaId?.[y] === id) return;
      temizle(y);
      if (!id) return;
      const x = E.al(id);
      if (y === 'kafa') { const o = kafaYap(x); ud.bas.add(o); ud.yuva[y] = o; }
      else if (y === 'govde') { const o = govdeYap(x, ud); ud.govde.add(o); ud.yuva[y] = o; }
      else if (y === 'bacak') { const o = bacakYap(x, ud); ud.govde.add(o); ud.yuva[y] = o; }
      else if (y === 'ayak') { ud.yuva[y] = ayakYap(x, ud); }
      else if (y === 'silah') { const o = silahYap(x); o.rotation.x = Math.PI / 2; ud.kol[1].userData.el.add(o); ud.yuva[y] = o; }
      else if (y === 'kalkan') { const o = kalkanYap(x); ud.kol[0].userData.el.add(o); ud.yuva[y] = o; }
    });
    ud.yuvaId = { ...kusam };
    const s = E.al(kusam?.silah);
    ud.saldiriTur = s ? s.tur : 'yakin';
    ud.kalkanVar = !!kusam?.kalkan;
    ud.beden.visible = !kusam?.govde || ['atlet', 'yelek'].includes(E.al(kusam.govde).sekil);
  }

  // ---------- Hareket ----------
  // durum: { hiz: 0..1 (yürüme), blk, olu, dt, kutla }
  function oynat(h, d) {
    const ud = h.userData, dt = d.dt;
    ud.saldiriT += dt;
    const yuru = d.olu ? 0 : Math.min(1, d.hiz);
    ud.faz += dt * (6 + 6 * yuru) * (yuru > 0.05 ? 1 : 0);
    const sal = Math.sin(ud.faz) * 0.75 * yuru;
    ud.bacak[0].rotation.x = sal; ud.bacak[1].rotation.x = -sal;
    // sağ kol: saldırı
    let sag = -0.15 - sal * 0.6;
    if (ud.saldiriTur === 'atis') sag = ud.saldiriT < 0.5 ? -1.5 + Math.max(0, 0.3 - ud.saldiriT) : -0.6 - sal * 0.3;
    else if (ud.saldiriT < 0.32) { const t = ud.saldiriT / 0.32; sag = t < 0.3 ? -0.5 - 2.1 * (t / 0.3) : -2.6 + 2.3 * ((t - 0.3) / 0.7); }
    else if (ud.yuva.silah) sag = -0.5 - sal * 0.3;
    // sol kol: kalkan
    ud.blk += ((d.blk ? 1 : 0) - ud.blk) * Math.min(1, dt * 14);
    const solBos = ud.kalkanVar ? -0.9 : -0.15 + sal * 0.6;
    const sol = solBos + (-1.45 - solBos) * ud.blk;
    if (d.kutla) { ud.kol[0].rotation.x = ud.kol[1].rotation.x = -2.9 + Math.sin(ud.faz * 2) * 0.2; ud.faz += dt * 4; }
    else { ud.kol[1].rotation.x += (sag - ud.kol[1].rotation.x) * Math.min(1, dt * 22); ud.kol[0].rotation.x += (sol - ud.kol[0].rotation.x) * Math.min(1, dt * 16); }
    ud.kol[0].rotation.z = ud.blk * 0.35;
    // ölüm: sırtüstü düşer
    ud.oluT = d.olu ? Math.min(1, ud.oluT + dt * 2.5) : Math.max(0, ud.oluT - dt * 4);
    ud.govde.rotation.x = -ud.oluT * Math.PI / 2;
    ud.govde.position.y = ud.oluT * 0.18;
    ud.govde.position.z = -ud.oluT * 0.1;
    ud.halka.visible = !d.olu;
    ud.govde.position.y += yuru > 0.05 ? Math.abs(Math.sin(ud.faz)) * 0.04 : 0;
  }
  function saldir(h) { h.userData.saldiriT = 0; }

  return { yap, giydir, oynat, saldir, TENLER, RENKLER, RENK_AD, silahYap, kalkanYap, kafaYap };
})();
