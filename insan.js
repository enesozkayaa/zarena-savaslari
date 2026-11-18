// =============================================================
// Zarena Savaşları - İNSAN KARAKTER ve eşyaların görünüşü
// Karakter +z yönüne bakar. Bacaklar kalçadan döner, dizden bükülür; kollar omuzdan döner, dirsekten bükülür.
// Silah sağ ele, kalkan sol ele takılır. Masada duran eşyalar için vitrin modelleri de burada.
// =============================================================

const Insan = (() => {
  const TENLER = [0xf0c8a0, 0xdcab80, 0xc48a5a, 0x8d5a34, 0xf8dcc4];
  const SACLAR = [0x2a1a10, 0x5a3a1a, 0x1a1a1a, 0x8a5a2a, 0xd8b060];
  const RENKLER = [0xe8483a, 0x2f7de0, 0x3fbf4a, 0xffc21a, 0xa04ae0, 0xff7ab8, 0x1ac8c8, 0xff8a1a, 0x8a5a2a, 0xf4f4f4];
  const RENK_AD = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Pembe', 'Turkuaz', 'Turuncu', 'Kahve', 'Beyaz'];
  const METAL = [0x9aa4ae, 0xc8ced6, 0x8a929c, 0xa8aeb6, 0xd8dee6, 0x6a6f78, 0x5a5f66, 0xe0f4ff];
  const ALTIN = [0xffcc22, 0xc8a030];
  const paylasimli = o => { o.userData.paylasimli = true; return o; };
  const mat = new Map();
  function M(renk, ops = {}) {
    const metal = ops.metal ?? (METAL.includes(renk) || ALTIN.includes(renk));
    const k = renk + '|' + metal + '|' + (ops.isik ? 1 : 0) + '|' + (ops.saydam || 1) + '|' + (ops.puruz ?? '');
    if (!mat.has(k)) mat.set(k, paylasimli(new THREE.MeshStandardMaterial({ color: renk, roughness: ops.puruz ?? (metal ? 0.32 : 0.8), metalness: metal ? 0.75 : 0, emissive: ops.isik ? renk : 0x000000, emissiveIntensity: ops.isik ? 0.9 : 0, transparent: !!ops.saydam, opacity: ops.saydam || 1 })));
    return mat.get(k);
  }
  const geo = new Map();
  const G = (k, f) => { if (!geo.has(k)) geo.set(k, paylasimli(f())); return geo.get(k); };
  function kutu(w, h, d, renk, x = 0, y = 0, z = 0, ops) {
    const m = new THREE.Mesh(G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(renk, ops)); m.position.set(x, y, z); m.castShadow = true; return m;
  }
  function silindir(r1, r2, h, renk, x = 0, y = 0, z = 0, ops, seg = 14) {
    const m = new THREE.Mesh(G(`c${r1},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r1, r2, h, seg)), M(renk, ops)); m.position.set(x, y, z); m.castShadow = true; return m;
  }
  function kure(r, renk, x = 0, y = 0, z = 0, ops, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(G(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12)), M(renk, ops)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; return m;
  }
  const TAHTA = 0x8a5a2a, KOYU = 0x4a2c14;

  // ---------- İskelet ----------
  // Ten rengindeki parçalar ud.tenParca'da tutulur (gölge vb. için)
  function iskelet(ten, renk, ops = {}) {
    const g = new THREE.Group();
    const govde = new THREE.Group(); g.add(govde);
    const ud = { govde, ten, renk, yuva: {}, faz: 0, saldiriT: 9, atisT: 9, saldiriTur: 'yakin', blk: 0, oluT: 0, kutlaT: 0 };
    g.userData = ud;
    const tm = ops.manken ? TAHTA : ten;
    ud.bacak = [-1, 1].map(s => {
      const kalca = new THREE.Group(); kalca.position.set(0.115 * s, 0.88, 0); govde.add(kalca);
      kalca.add(kutu(0.17, 0.44, 0.2, tm, 0, -0.21, 0));
      const diz = new THREE.Group(); diz.position.set(0, -0.42, 0); kalca.add(diz);
      diz.add(kutu(0.15, 0.4, 0.17, tm, 0, -0.19, 0));
      const ayak = new THREE.Group(); ayak.position.set(0, -0.41, 0.03); diz.add(ayak);
      const cip = kutu(0.14, 0.07, 0.25, tm, 0, -0.01, 0.03); ayak.add(cip); ayak.userData.cip = cip;
      kalca.userData = { diz, ayak };
      return kalca;
    });
    // Gövde: karın + göğüs (V biçimi)
    ud.karin = kutu(0.42, 0.32, 0.24, tm, 0, 1.07, 0); govde.add(ud.karin);
    ud.gogus = kutu(0.5, 0.36, 0.27, tm, 0, 1.38, 0); govde.add(ud.gogus);
    if (!ops.manken) {
      ud.don = kutu(0.45, 0.2, 0.27, renk, 0, 0.9, 0); govde.add(ud.don);
      ud.ciplak = new THREE.Group(); govde.add(ud.ciplak);
      ud.ciplak.add(kutu(0.2, 0.012, 0.01, 0x000000, 0, 1.3, 0.136, { saydam: 0.18 }));      // göğüs çizgisi
      ud.ciplak.add(kutu(0.012, 0.22, 0.01, 0x000000, 0, 1.08, 0.121, { saydam: 0.14 }));    // karın çizgisi
      ud.ciplak.add(kutu(0.025, 0.025, 0.01, 0x6a3a2a, 0, 0.99, 0.121));                     // göbek
      [-1, 1].forEach(s => ud.ciplak.add(kutu(0.035, 0.035, 0.01, 0xa0605a, 0.12 * s, 1.36, 0.136)));
    }
    // Boyun + baş
    govde.add(silindir(0.07, 0.08, 0.12, tm, 0, 1.6, 0));
    const bas = new THREE.Group(); bas.position.set(0, 1.79, 0); govde.add(bas); ud.bas = bas;
    bas.add(kutu(0.29, 0.33, 0.29, tm, 0, 0, 0));
    if (!ops.manken) {
      const sac = ops.sac ?? SACLAR[0];
      bas.add(kutu(0.31, 0.09, 0.31, sac, 0, 0.15, -0.005));
      bas.add(kutu(0.31, 0.2, 0.06, sac, 0, 0.06, -0.13));
      [-1, 1].forEach(s => {
        bas.add(kutu(0.065, 0.045, 0.01, 0xffffff, 0.07 * s, 0.03, 0.146, { metal: false }));
        bas.add(kutu(0.03, 0.04, 0.012, 0x1a1208, 0.07 * s, 0.03, 0.149, { metal: false }));
        bas.add(kutu(0.08, 0.018, 0.012, sac, 0.07 * s, 0.075, 0.148));       // kaş
        bas.add(kutu(0.03, 0.07, 0.05, ten, 0.155 * s, 0.0, 0));             // kulak
      });
      bas.add(kutu(0.045, 0.08, 0.05, ten, 0, -0.02, 0.165));                 // burun
      bas.add(kutu(0.1, 0.02, 0.01, 0x8a3a2a, 0, -0.095, 0.146));             // ağız
      if (ops.biyik) bas.add(kutu(0.13, 0.03, 0.02, sac, 0, -0.07, 0.152));
    }
    // Kollar
    ud.kol = [-1, 1].map(s => {
      const omuz = new THREE.Group(); omuz.position.set(0.31 * s, 1.5, 0); govde.add(omuz);
      omuz.add(kutu(0.13, 0.33, 0.14, tm, 0, -0.15, 0));
      const dirsek = new THREE.Group(); dirsek.position.set(0, -0.31, 0); omuz.add(dirsek);
      dirsek.add(kutu(0.12, 0.28, 0.13, tm, 0, -0.13, 0));
      const el = new THREE.Group(); el.position.set(0, -0.3, 0); dirsek.add(el);
      el.add(kutu(0.1, 0.11, 0.11, tm, 0, 0, 0));
      omuz.userData = { dirsek, el };
      return omuz;
    });
    return g;
  }

  function yap(renkNo, tenNo) {
    const ten = TENLER[tenNo % TENLER.length], renk = RENKLER[renkNo % RENKLER.length];
    const g = iskelet(ten, renk, { sac: SACLAR[(renkNo * 3 + tenNo) % SACLAR.length], biyik: renkNo % 3 === 1 });
    const ud = g.userData;
    // Ayak altında renkli halka
    const halka = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 32), new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: 0.8, depthWrite: false }));
    halka.rotation.x = -Math.PI / 2; halka.position.y = 0.02; g.add(halka); ud.halka = halka;
    duruş(ud);
    return g;
  }
  function duruş(ud) {
    ud.kol.forEach(k => { k.rotation.x = -0.1; k.userData.dirsek.rotation.x = -0.25; });
  }

  // ---------- Eşyalar ----------
  function kafaYap(x) {
    const r = x.renk, g = new THREE.Group();
    switch (x.sekil) {
      case 'koni': g.add(silindir(0.001, 0.12, 0.3, r, 0, 0.3, 0)); g.add(kure(0.035, 0xffee55, 0, 0.46, 0)); [0.22, 0.3].forEach(y => g.add(silindir(0.09 - (y - 0.22), 0.1 - (y - 0.22), 0.02, 0xffee55, 0, y, 0))); break;
      case 'asci': g.add(silindir(0.17, 0.16, 0.12, r, 0, 0.21, 0)); g.add(kure(0.2, r, 0, 0.36, 0, {}, 1, 0.7, 1)); break;
      case 'tavuk': g.add(kutu(0.36, 0.38, 0.36, r, 0, 0.02, 0)); g.add(kutu(0.04, 0.12, 0.16, 0xe8202a, 0, 0.26, 0.02)); g.add(kutu(0.1, 0.06, 0.12, 0xffa020, 0, 0, 0.23)); g.add(kutu(0.06, 0.08, 0.03, 0xe8202a, 0, -0.08, 0.2)); [-1, 1].forEach(s => g.add(kutu(0.05, 0.05, 0.02, 0x111111, 0.09 * s, 0.07, 0.185))); break;
      case 'kova': g.add(silindir(0.19, 0.16, 0.26, r, 0, 0.14, 0)); { const t = new THREE.Mesh(G('tKova', () => new THREE.TorusGeometry(0.18, 0.01, 6, 16, Math.PI)), M(0x555555, { metal: true })); t.position.y = 0.27; g.add(t); } g.add(silindir(0.195, 0.195, 0.02, 0x666666, 0, 0.05, 0)); break;
      case 'bere': g.add(kure(0.18, r, 0, 0.1, 0, {}, 1, 0.8, 1)); g.add(silindir(0.18, 0.18, 0.06, 0xf0f0f0, 0, 0.06, 0)); g.add(kure(0.06, 0xffffff, 0, 0.27, 0)); break;
      case 'kovboy': g.add(silindir(0.34, 0.34, 0.025, r, 0, 0.15, 0)); g.add(silindir(0.14, 0.17, 0.2, r, 0, 0.26, 0)); g.add(silindir(0.172, 0.172, 0.04, 0x2a1a0a, 0, 0.19, 0)); break;
      case 'kask': g.add(kure(0.19, r, 0, 0.06, -0.01, {}, 1, 0.9, 1.05)); [-1, 1].forEach(s => g.add(kutu(0.03, 0.14, 0.12, r, 0.16 * s, -0.06, 0.02))); break;
      case 'bant': g.add(kutu(0.31, 0.06, 0.31, r, 0, 0.09, 0)); g.add(kutu(0.04, 0.22, 0.02, r, 0.05, 0.0, -0.17)); g.add(kutu(0.04, 0.2, 0.02, r, -0.03, -0.01, -0.17)); break;
      case 'viking': g.add(kure(0.19, r, 0, 0.06, 0, {}, 1, 0.9, 1.05)); g.add(kutu(0.04, 0.16, 0.04, r, 0, -0.01, 0.17)); [-1, 1].forEach(s => { const b = silindir(0.001, 0.05, 0.24, 0xf4ecd8, 0.21 * s, 0.17, 0); b.rotation.z = -0.9 * s; g.add(b); }); break;
      case 'tac': g.add(silindir(0.165, 0.165, 0.08, r, 0, 0.2, 0)); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(silindir(0.001, 0.028, 0.09, r, Math.sin(a) * 0.155, 0.28, Math.cos(a) * 0.155)); } [0xe82a5a, 0x2a8ae8, 0x2ae85a].forEach((c, i) => g.add(kure(0.025, c, Math.sin(i * 2.1) * 0.168, 0.2, Math.cos(i * 2.1) * 0.168, { metal: false, puruz: 0.1 }))); break;
      case 'sovalye': g.add(kutu(0.36, 0.4, 0.36, r, 0, 0.03, 0)); g.add(kutu(0.3, 0.025, 0.02, 0x111111, 0, 0.05, 0.181, { metal: false })); for (let i = 0; i < 4; i++) g.add(kutu(0.012, 0.08, 0.02, 0x111111, -0.06 + i * 0.04, -0.07, 0.181, { metal: false })); g.add(kutu(0.04, 0.14, 0.26, 0xd8302a, 0, 0.29, -0.02, { metal: false })); break;
      case 'ejderkafa': g.add(kutu(0.38, 0.3, 0.4, r, 0, 0.12, 0.02)); g.add(kutu(0.3, 0.06, 0.12, 0xf4ecd8, 0, -0.02, 0.21)); for (let i = 0; i < 5; i++) g.add(silindir(0.001, 0.018, 0.05, 0xffffff, -0.1 + i * 0.05, -0.07, 0.24)); [-1, 1].forEach(s => { const b = silindir(0.001, 0.05, 0.28, 0xf4ecd8, 0.14 * s, 0.33, -0.08); b.rotation.x = -0.6; g.add(b); g.add(kure(0.03, 0xffd020, 0.09 * s, 0.14, 0.22, { isik: true })); }); break;
      default: g.add(kure(0.19, r, 0, 0.08, 0, {}, 1, 0.8, 1));
    }
    return g;
  }
  // Gövde: kolluk parçaları ud.kol gruplarına eklenir
  function govdeYap(x, ud) {
    const r = x.renk, g = new THREE.Group(), ek = [];
    const kol = (uzun, renk = r) => ud.kol.forEach(k => {
      const ust = kutu(0.155, uzun ? 0.34 : 0.2, 0.165, renk, 0, uzun ? -0.15 : -0.08, 0); k.add(ust); ek.push(ust);
      if (uzun) { const alt = kutu(0.145, 0.27, 0.155, renk, 0, -0.12, 0); k.userData.dirsek.add(alt); ek.push(alt); }
    });
    const ana = (renk = r) => { g.add(kutu(0.53, 0.38, 0.3, renk, 0, 1.38, 0)); g.add(kutu(0.46, 0.36, 0.28, renk, 0, 1.06, 0)); };
    switch (x.sekil) {
      case 'kutu': g.add(kutu(0.66, 0.66, 0.44, r, 0, 1.2, 0, { metal: false })); g.add(kutu(0.67, 0.03, 0.03, 0xb08a4a, 0, 1.5, 0.21)); g.add(kutu(0.2, 0.08, 0.005, 0x222222, -0.15, 1.3, 0.222, { saydam: 0.5 })); break;
      case 'atlet': g.add(kutu(0.44, 0.34, 0.26, r, 0, 1.36, 0)); g.add(kutu(0.43, 0.34, 0.26, r, 0, 1.06, 0)); break;
      case 'tisort': ana(); kol(false); if (r === 0xff8a3a) [[-0.12, 1.4], [0.1, 1.2], [-0.05, 1.05], [0.15, 1.42]].forEach(([a, b]) => g.add(kutu(0.07, 0.07, 0.005, 0xffe040, a, b, 0.152))); break;
      case 'kazak': ana(); kol(true); g.add(kutu(0.3, 0.07, 0.3, r, 0, 1.58, 0)); for (let i = 0; i < 3; i++) g.add(kutu(0.54, 0.025, 0.31, 0xffffff, 0, 1.15 + i * 0.12, 0)); break;
      case 'bornoz': ana(); kol(true); g.add(kutu(0.5, 0.5, 0.31, r, 0, 0.72, 0)); g.add(kutu(0.5, 0.05, 0.32, 0xc8b8e8, 0, 1.0, 0)); g.add(kutu(0.06, 0.62, 0.32, 0xc8b8e8, 0.04, 1.3, 0.005)); break;
      case 'yelek': [-1, 1].forEach(s => g.add(kutu(0.17, 0.66, 0.29, r, 0.17 * s, 1.22, 0))); g.add(kutu(0.52, 0.66, 0.08, r, 0, 1.22, -0.11)); for (let i = 0; i < 3; i++) g.add(kutu(0.02, 0.02, 0.01, 0xd8b050, 0.09, 1.08 + i * 0.12, 0.15)); break;
      case 'smokin': ana(); kol(true); g.add(kutu(0.14, 0.6, 0.005, 0xffffff, 0, 1.25, 0.152)); g.add(kutu(0.14, 0.05, 0.03, 0xd8202a, 0, 1.5, 0.16)); [-1, 1].forEach(s => { const y = kutu(0.06, 0.3, 0.01, 0x333340, 0.1 * s, 1.38, 0.153); y.rotation.z = 0.25 * s; g.add(y); }); break;
      case 'fici': g.add(silindir(0.36, 0.36, 0.72, r, 0, 1.18, 0, { metal: false }, 18)); [0.88, 1.18, 1.48].forEach(y => g.add(silindir(0.372, 0.372, 0.05, 0x5a5f66, 0, y, 0, { metal: true }, 18))); g.add(kutu(0.6, 0.04, 0.05, 0x3a2414, 0, 1.56, 0)); break;
      case 'zirh': ana(); kol(true); for (let y = 0.98; y < 1.55; y += 0.06) g.add(kutu(0.535, 0.012, 0.305, 0x6a727c, 0, y, 0)); g.add(kutu(0.54, 0.07, 0.31, 0x5a3a1a, 0, 0.94, 0, { metal: false })); break;
      case 'plaka': {
        ana(); kol(true);
        const vurgu = r === 0x2e9a5a ? 0x8ae0aa : 0xe8ecf0;
        [-1, 1].forEach(s => { const o = kure(0.15, r, 0.31 * s, 1.52, 0, {}, 1, 0.6, 1.05); g.add(o); });
        g.add(kutu(0.34, 0.26, 0.03, vurgu, 0, 1.38, 0.15)); g.add(kutu(0.3, 0.06, 0.03, vurgu, 0, 1.12, 0.145)); g.add(kutu(0.3, 0.06, 0.03, vurgu, 0, 1.02, 0.145));
        g.add(kutu(0.54, 0.07, 0.31, 0x5a3a1a, 0, 0.94, 0, { metal: false }));
        break;
      }
      default: ana();
    }
    g.userData.ek = ek;
    return g;
  }
  function bacakYap(x, ud) {
    const r = x.renk, g = new THREE.Group(), ek = [];
    const bacaga = uzun => ud.bacak.forEach(b => {
      const ust = kutu(0.19, uzun ? 0.46 : 0.26, 0.22, r, 0, uzun ? -0.21 : -0.11, 0); b.add(ust); ek.push(ust);
      if (uzun) { const alt = kutu(0.175, 0.36, 0.195, r, 0, -0.17, 0); b.userData.diz.add(alt); ek.push(alt); }
    });
    const bel = () => { g.add(kutu(0.47, 0.22, 0.29, r, 0, 0.9, 0)); g.add(kutu(0.48, 0.04, 0.295, 0x2a1a0a, 0, 0.99, 0, { metal: false })); g.add(kutu(0.06, 0.04, 0.01, 0xc8a030, 0, 0.99, 0.15)); };
    switch (x.sekil) {
      case 'pantolon': bacaga(true); bel(); break;
      case 'sort': bacaga(false); bel(); break;
      case 'etek': g.add(silindir(0.25, 0.33, 0.44, r, 0, 0.74, 0, {}, 12)); for (let i = 0; i < 3; i++) g.add(silindir(0.255 + i * 0.03, 0.27 + i * 0.03, 0.02, 0xd8302a, 0, 0.88 - i * 0.12, 0, {}, 12)); g.add(kutu(0.1, 0.12, 0.02, 0xd8d8d8, 0, 0.82, 0.29)); break;
      case 'tutu': bel(); g.add(silindir(0.44, 0.44, 0.05, r, 0, 0.86, 0, {}, 20)); g.add(silindir(0.38, 0.38, 0.05, 0xffd0ea, 0, 0.82, 0, {}, 20)); break;
    }
    g.userData.ek = ek;
    return g;
  }
  function ayakkabi(x, a) {
    const r = x.renk, g = new THREE.Group(); a.add(g);
    switch (x.sekil) {
      case 'terlik': g.add(kutu(0.17, 0.035, 0.29, r, 0, -0.045, 0.03)); g.add(kutu(0.17, 0.04, 0.06, r, 0, -0.015, 0.08)); break;
      case 'palet': g.add(kutu(0.24, 0.025, 0.58, r, 0, -0.045, 0.18)); g.add(kutu(0.17, 0.07, 0.15, 0x222222, 0, -0.01, 0.0)); break;
      case 'topuk': g.add(kutu(0.16, 0.07, 0.26, r, 0, 0.0, 0.04, { puruz: 0.2 })); g.add(silindir(0.02, 0.012, 0.12, r, 0, -0.08, -0.08)); break;
      case 'tavsan': g.add(kure(0.13, r, 0, 0.0, 0.05, {}, 1, 0.75, 1.35)); [-1, 1].forEach(s => { g.add(kutu(0.045, 0.16, 0.025, r, 0.05 * s, 0.13, 0.15)); g.add(kure(0.016, 0x111111, 0.04 * s, 0.04, 0.21)); }); g.add(kure(0.02, 0xff8ab8, 0, 0.02, 0.225)); break;
      case 'cizme': g.add(kutu(0.18, 0.1, 0.29, r, 0, -0.005, 0.04)); g.add(kutu(0.18, 0.3, 0.2, r, 0, 0.17, 0)); g.add(kutu(0.185, 0.03, 0.29, 0x1a1a1a, 0, -0.045, 0.04, { metal: false })); break;
      case 'spor': g.add(kutu(0.17, 0.1, 0.29, r, 0, 0.0, 0.04)); g.add(kutu(0.175, 0.035, 0.3, 0xf0f0f0, 0, -0.045, 0.04)); g.add(kutu(0.01, 0.05, 0.16, 0xe8483a, 0.088, 0.0, 0.03)); g.add(kutu(0.01, 0.05, 0.16, 0xe8483a, -0.088, 0.0, 0.03)); break;
      case 'paten': g.add(kutu(0.17, 0.2, 0.28, r, 0, 0.05, 0.03)); g.add(kutu(0.05, 0.04, 0.3, 0x888888, 0, -0.07, 0.04, { metal: true })); [-0.08, 0.0, 0.08, 0.16].forEach(z => { const t = silindir(0.035, 0.035, 0.035, 0x222222, 0, -0.1, z, { metal: false }, 10); t.rotation.z = Math.PI / 2; g.add(t); }); break;
      case 'kanatli': g.add(kutu(0.16, 0.04, 0.27, r, 0, -0.04, 0.03)); g.add(kutu(0.17, 0.02, 0.04, r, 0, 0.02, 0.08)); [-1, 1].forEach(s => { for (let i = 0; i < 3; i++) { const k = kutu(0.012, 0.06 + i * 0.03, 0.08, 0xffffff, 0.1 * s, 0.05 + i * 0.03, -0.04 - i * 0.04, { metal: false }); k.rotation.x = -0.5; k.rotation.z = 0.35 * s; g.add(k); } }); break;
      default: g.add(kutu(0.17, 0.1, 0.28, r, 0, 0, 0.03));
    }
    return g;
  }
  // Silah +y yönüne uzanır, sap 0'da (ele takılınca ileri bakar)
  function silahYap(x) {
    const r = x.renk, g = new THREE.Group(), sap = 0x5a3416;
    switch (x.sekil) {
      case 'tuy': g.add(silindir(0.018, 0.018, 0.5, 0x3a2414, 0, 0.2, 0)); for (let i = 0; i < 8; i++) { const t = kure(0.07, r, Math.sin(i) * 0.06, 0.48 + (i % 4) * 0.05, Math.cos(i) * 0.06, { metal: false }, 0.7, 1.6, 0.7); g.add(t); } break;
      case 'balik': g.add(kure(0.12, r, 0, 0.36, 0, {}, 0.55, 2.2, 1)); { const k = kutu(0.02, 0.16, 0.2, r, 0, 0.06, 0); g.add(k); } [-1, 1].forEach(s => g.add(kure(0.022, 0xffffff, 0.05 * s, 0.56, 0.06, { metal: false }))); g.add(kutu(0.01, 0.12, 0.1, 0x6a94a8, 0, 0.38, 0.11)); break;
      case 'supurge': g.add(silindir(0.022, 0.022, 1.3, 0xc8945a, 0, 0.45, 0)); g.add(kutu(0.1, 0.06, 0.1, 0xd8302a, 0, 1.08, 0)); g.add(silindir(0.06, 0.2, 0.36, 0xe0c050, 0, 1.28, 0, {}, 10)); break;
      case 'semsiye': g.add(silindir(0.018, 0.018, 1.0, 0x222222, 0, 0.35, 0)); { const k = new THREE.Mesh(G('tSemsiye', () => new THREE.TorusGeometry(0.06, 0.015, 6, 10, Math.PI)), M(0x222222)); k.position.y = -0.17; k.position.x = 0.06; g.add(k); } g.add(silindir(0.05, 0.16, 0.65, r, 0, 0.62, 0, {}, 8)); break;
      case 'baget': g.add(silindir(0.055, 0.06, 0.95, r, 0, 0.35, 0, {}, 10)); for (let i = 0; i < 4; i++) { const c = kutu(0.1, 0.012, 0.03, 0xf0d8a0, 0, 0.1 + i * 0.2, 0.05); c.rotation.z = 0.5; g.add(c); } break;
      case 'sopa': g.add(silindir(0.065, 0.025, 0.95, r, 0, 0.38, 0)); g.add(silindir(0.035, 0.035, 0.03, 0x222222, 0, -0.08, 0)); break;
      case 'torba': g.add(kure(0.16, 0xc8945a, 0, 0.0, 0.0, { metal: false }, 1, 0.9, 1)); [[0.06, 0.13], [-0.05, 0.12], [0.0, 0.16]].forEach(([a, b]) => g.add(kure(0.06, r, a, b, 0.04, { metal: false, puruz: 0.3 }))); break;
      case 'tava': g.add(silindir(0.022, 0.022, 0.42, 0x1a1a1a, 0, 0.12, 0)); { const d = silindir(0.22, 0.19, 0.05, r, 0, 0.55, 0, { metal: true }); d.rotation.x = Math.PI / 2; g.add(d); } break;
      case 'sapan': g.add(silindir(0.025, 0.025, 0.3, r, 0, 0.1, 0)); [-1, 1].forEach(s => { const c = silindir(0.02, 0.02, 0.2, r, 0.06 * s, 0.32, 0); c.rotation.z = -0.5 * s; g.add(c); }); g.add(kutu(0.2, 0.01, 0.01, 0x8a2a2a, 0, 0.4, 0)); break;
      case 'hancer': g.add(silindir(0.022, 0.022, 0.13, sap, 0, 0.03, 0)); g.add(kutu(0.14, 0.03, 0.04, 0xc8a030, 0, 0.11, 0)); { const b = kutu(0.055, 0.3, 0.012, r, 0, 0.27, 0); g.add(b); g.add(silindir(0.001, 0.028, 0.06, r, 0, 0.45, 0, {}, 4)); } break;
      case 'mizrak': g.add(silindir(0.022, 0.022, 1.8, r, 0, 0.7, 0)); g.add(silindir(0.001, 0.055, 0.26, 0xc8ced6, 0, 1.73, 0, { metal: true }, 4)); g.add(silindir(0.03, 0.03, 0.04, 0x8a2a2a, 0, 1.58, 0)); break;
      case 'yay': { const y = new THREE.Mesh(G('tYay', () => new THREE.TorusGeometry(0.42, 0.022, 6, 20, Math.PI * 0.85)), M(r)); y.rotation.y = Math.PI / 2; y.rotation.x = Math.PI / 2 - Math.PI * 0.425; y.position.z = -0.12; g.add(y); g.add(silindir(0.003, 0.003, 0.8, 0xffffff, 0, 0, -0.22)); g.add(kutu(0.04, 0.12, 0.05, 0x3a2414, 0, 0, 0.29)); } break;
      case 'cekic': g.add(silindir(0.028, 0.028, 1.1, sap, 0, 0.45, 0)); g.add(kutu(0.44, 0.26, 0.26, r, 0, 1.0, 0, { metal: true })); g.add(kutu(0.46, 0.04, 0.27, 0x3a3f46, 0, 1.0, 0, { metal: true })); break;
      case 'kilic': g.add(silindir(0.022, 0.022, 0.2, sap, 0, 0.03, 0)); g.add(kure(0.035, 0xc8a030, 0, -0.08, 0)); g.add(kutu(0.26, 0.04, 0.05, 0xc8a030, 0, 0.15, 0)); g.add(kutu(0.07, 0.82, 0.015, r, 0, 0.58, 0)); g.add(kutu(0.012, 0.75, 0.017, 0x9aa0a8, 0, 0.56, 0)); g.add(silindir(0.001, 0.05, 0.1, r, 0, 1.03, 0, {}, 4)); break;
      case 'balta': g.add(silindir(0.026, 0.026, 1.0, sap, 0, 0.4, 0)); { const b = kutu(0.025, 0.36, 0.28, r, 0, 0.8, 0.13, { metal: true }); g.add(b); g.add(kutu(0.03, 0.4, 0.04, 0xe8ecf0, 0, 0.8, 0.28, { metal: true })); g.add(kutu(0.025, 0.12, 0.12, r, 0, 0.82, -0.08, { metal: true })); } break;
      case 'arbalet': g.add(kutu(0.06, 0.06, 0.58, r, 0, 0.0, 0.15)); { const k = new THREE.Mesh(G('tArbalet', () => new THREE.TorusGeometry(0.3, 0.02, 6, 14, Math.PI * 0.7)), M(0x3a2414)); k.rotation.x = -Math.PI / 2; k.rotation.z = Math.PI * 0.15; k.position.z = 0.32; g.add(k); } g.add(kutu(0.5, 0.004, 0.004, 0xffffff, 0, 0.01, 0.12)); break;
      case 'asa': g.add(silindir(0.028, 0.035, 1.3, 0x5a3a1a, 0, 0.45, 0)); for (let i = 0; i < 4; i++) { const c = silindir(0.012, 0.012, 0.18, 0x5a3a1a, Math.sin(i * 1.57) * 0.06, 1.15, Math.cos(i * 1.57) * 0.06); c.rotation.z = Math.sin(i * 1.57) * 0.4; c.rotation.x = -Math.cos(i * 1.57) * 0.4; g.add(c); } g.add(kure(0.1, r, 0, 1.2, 0, { isik: true })); break;
      default: break;
    }
    return g;
  }
  // Kalkan: yüzü elin -y yönüne bakar (kol ileri uzanınca yüzü öne bakar)
  function kalkanYap(x) {
    const r = x.renk, g = new THREE.Group();
    switch (x.sekil) {
      case 'kutuK': g.add(kutu(0.45, 0.05, 0.45, r, 0, -0.08, 0, { metal: false })); g.add(kutu(0.25, 0.052, 0.08, 0xd8302a, 0, -0.08, 0.1)); g.add(kure(0.03, 0xd8302a, -0.1, -0.11, -0.08)); break;
      case 'yuvarlak': {
        const ayna = r === 0xe0f4ff;
        g.add(silindir(0.32, 0.32, 0.045, r, 0, -0.08, 0, ayna ? { metal: true, puruz: 0.02 } : {}, 24));
        const k = new THREE.Mesh(G('tKalkan', () => new THREE.TorusGeometry(0.32, 0.022, 6, 24)), M(ayna ? 0xc8a030 : 0x444444)); k.rotation.x = Math.PI / 2; k.position.y = -0.08; g.add(k);
        g.add(silindir(0.07, 0.07, 0.07, ayna ? 0xc8a030 : 0x444444, 0, -0.11, 0, { metal: true }));
        if (r === 0x8a5a2a) for (let i = -1; i <= 1; i++) g.add(kutu(0.012, 0.047, 0.6, 0x5a3416, i * 0.16, -0.08, 0));
        break;
      }
      case 'kitap': g.add(kutu(0.32, 0.1, 0.42, r, 0, -0.08, 0, { metal: false })); g.add(kutu(0.3, 0.102, 0.39, 0xf4ecd8, 0.012, -0.08, 0, { metal: false })); g.add(kutu(0.2, 0.006, 0.05, 0xffd020, 0, -0.132, 0.08)); break;
      case 'kapi': g.add(kutu(0.6, 0.06, 1.15, r, 0, -0.1, 0.25, { metal: false })); [-0.15, 0.15].forEach(a => g.add(kutu(0.22, 0.065, 0.42, 0x5a3416, a, -0.1, a < 0 ? 0.5 : 0.0))); g.add(kure(0.035, 0xffcc22, 0.22, -0.15, 0.25, { metal: true })); break;
      case 'kule': g.add(kutu(0.48, 0.06, 0.72, r, 0, -0.08, 0.08, { metal: true })); g.add(kutu(0.5, 0.065, 0.04, 0xd8302a, 0, -0.08, 0.08)); g.add(kutu(0.04, 0.065, 0.72, 0xd8302a, 0, -0.08, 0.08)); g.add(kure(0.05, 0xc8a030, 0, -0.12, 0.08, { metal: true })); break;
    }
    return g;
  }

  // Kuşamı karaktere giydir (değişen yuvaları yeniler)
  function giydir(h, kusam) {
    const ud = h.userData, E = Esya;
    const temizle = y => {
      const v = ud.yuva[y]; if (!v) return;
      (Array.isArray(v) ? v : [v]).forEach(o => { o.parent && o.parent.remove(o); (o.userData?.ek || []).forEach(k => k.parent && k.parent.remove(k)); });
      delete ud.yuva[y];
    };
    E.YUVALAR.forEach(y => {
      const id = kusam?.[y];
      if ((ud.yuvaId || {})[y] === id) return;
      temizle(y);
      if (!id) return;
      const x = E.al(id);
      if (y === 'kafa') { const o = kafaYap(x); ud.bas.add(o); ud.yuva[y] = o; }
      else if (y === 'govde') { const o = govdeYap(x, ud); ud.govde.add(o); ud.yuva[y] = o; }
      else if (y === 'bacak') { const o = bacakYap(x, ud); ud.govde.add(o); ud.yuva[y] = o; }
      else if (y === 'ayak') { ud.yuva[y] = ud.bacak.map(b => ayakkabi(x, b.userData.ayak)); }
      else if (y === 'silah') { const o = silahYap(x); o.rotation.x = Math.PI / 2; ud.kol[1].userData.el.add(o); ud.yuva[y] = o; }
      else if (y === 'kalkan') { const o = kalkanYap(x); ud.kol[0].userData.el.add(o); ud.yuva[y] = o; }
    });
    ud.yuvaId = { ...kusam };
    const s = E.al(kusam?.silah);
    ud.saldiriTur = s ? s.tur : 'yakin';
    ud.kalkanVar = !!kusam?.kalkan;
    const g = kusam?.govde ? E.al(kusam.govde).sekil : null;
    if (ud.ciplak) ud.ciplak.visible = !g || g === 'yelek';
    ud.bacak.forEach(b => { b.userData.ayak.userData.cip.visible = !kusam?.ayak; });
  }

  // Masada duran eşya: kıyafetler tahta manken üstünde, silah ve kalkan ayaklıkta
  function vitrin(id) {
    const x = Esya.al(id), g = new THREE.Group();
    if (x.yuva === 'kafa') {
      g.add(silindir(0.03, 0.06, 0.25, KOYU, 0, 0.12, 0)); const bas = kutu(0.26, 0.3, 0.26, TAHTA, 0, 0.4, 0); g.add(bas);
      const k = kafaYap(x); k.position.y = 0.4; g.add(k);
    } else if (x.yuva === 'govde' || x.yuva === 'bacak' || x.yuva === 'ayak') {
      const m = iskelet(TAHTA, TAHTA, { manken: true });
      const ud = m.userData;
      ud.kol.forEach((k, i) => { k.rotation.z = (i ? -1 : 1) * 0.12; });
      if (x.yuva === 'govde') { const o = govdeYap(x, ud); ud.govde.add(o); ud.bacak.forEach(b => { b.visible = false; }); m.position.y = -0.82; }
      if (x.yuva === 'bacak') { const o = bacakYap(x, ud); ud.govde.add(o); ud.kol.forEach(k => { k.visible = false; }); ud.bas.visible = false; ud.gogus.visible = false; }
      if (x.yuva === 'ayak') { ud.bacak.forEach(b => ayakkabi(x, b.userData.ayak)); ud.kol.forEach(k => { k.visible = false; }); ud.bas.visible = false; ud.gogus.visible = false; ud.karin.visible = false; m.position.y = 0.05; }
      const s = x.yuva === 'ayak' ? 0.75 : 0.62; m.scale.setScalar(s);
      if (x.yuva === 'govde') m.position.y = -0.82 * s + 0.12;
      if (x.yuva === 'bacak') m.position.y = 0.05;
      if (x.yuva === 'ayak') { ud.bacak.forEach(b => { b.children[0].visible = false; b.userData.diz.children[0].visible = false; b.userData.ayak.userData.cip.visible = false; }); m.position.y = 0.0; }
      g.add(m);
      if (x.yuva === 'govde') g.add(silindir(0.03, 0.06, 0.2, KOYU, 0, 0.1, 0));
    } else if (x.yuva === 'silah') {
      const s = silahYap(x); const boy = new THREE.Box3().setFromObject(s).getSize(new THREE.Vector3()).y;
      const k = Math.min(1, 0.95 / Math.max(0.3, boy)); s.scale.setScalar(k); s.rotation.z = 0.35; s.position.y = 0.12; g.add(s);
      g.add(kutu(0.3, 0.06, 0.3, KOYU, 0, 0.03, 0));
    } else if (x.yuva === 'kalkan') {
      const k = kalkanYap(x); k.rotation.x = -Math.PI / 2; k.position.y = 0.42; k.position.z = 0.04; g.add(k);
      g.add(kutu(0.3, 0.06, 0.3, KOYU, 0, 0.03, 0)); g.add(silindir(0.02, 0.02, 0.3, KOYU, 0, 0.18, -0.05));
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  // ---------- Hareket ----------
  // d: { dt, hiz (0..1 yürüme, - geri), blk, olu, kutla }
  function oynat(h, d) {
    const ud = h.userData, dt = d.dt;
    ud.saldiriT += dt; ud.atisT += dt;
    const yuru = d.olu ? 0 : Math.min(1, Math.abs(d.hiz || 0));
    if (yuru > 0.05) ud.faz += dt * (5 + 6 * yuru) * Math.sign(d.hiz || 1);
    else ud.faz *= 0.9;
    const s = Math.sin(ud.faz) * yuru;
    const L = ud.bacak;
    L[0].rotation.x = s * 0.6; L[1].rotation.x = -s * 0.6;
    L[0].userData.diz.rotation.x = Math.max(0, -Math.cos(ud.faz)) * 0.9 * yuru + 0.05;
    L[1].userData.diz.rotation.x = Math.max(0, Math.cos(ud.faz)) * 0.9 * yuru + 0.05;
    // Sağ kol (silah)
    let o1 = -0.1 - s * 0.45, d1 = -0.3;
    if (ud.yuva.silah) { o1 = -0.35 - s * 0.15; d1 = -1.15; }            // savaş duruşu
    if (ud.saldiriTur === 'atis' && ud.yuva.silah) { o1 = -1.2; d1 = -0.35; if (ud.saldiriT < 0.35) { o1 = -1.5; d1 = 0.05 * Math.min(1, ud.saldiriT * 5); } }
    else if (ud.saldiriT < 0.34) {
      const t = ud.saldiriT / 0.34;
      if (t < 0.3) { const k = t / 0.3; o1 = -0.4 - 2.3 * k; d1 = -1.1 + 0.5 * k; }
      else { const k = (t - 0.3) / 0.7; o1 = -2.7 + 2.3 * k; d1 = -0.6 + 0.5 * k; }
    }
    if (ud.atisT < 0.6) { const t = ud.atisT / 0.6; o1 = t < 0.4 ? -0.3 + 0.5 * (t / 0.4) : 0.2 - 1.6 * ((t - 0.4) / 0.6); d1 = -0.2; }   // zar atma
    // Sol kol (kalkan)
    ud.blk += ((d.blk ? 1 : 0) - ud.blk) * Math.min(1, dt * 14);
    const o0b = ud.kalkanVar ? -0.45 : -0.1 + s * 0.45, d0b = ud.kalkanVar ? -0.9 : -0.3;
    const o0 = o0b + (-1.45 - o0b) * ud.blk, d0 = d0b + (-0.15 - d0b) * ud.blk;
    const k = Math.min(1, dt * 18);
    if (d.kutla) {
      ud.kutlaT += dt;
      ud.kol.forEach((kk, i) => { kk.rotation.x += (-2.8 + Math.sin(ud.kutlaT * 9 + i) * 0.25 - kk.rotation.x) * k; kk.userData.dirsek.rotation.x += (-0.3 - kk.userData.dirsek.rotation.x) * k; });
    } else {
      const K = ud.kol;
      K[1].rotation.x += (o1 - K[1].rotation.x) * k; K[1].userData.dirsek.rotation.x += (d1 - K[1].userData.dirsek.rotation.x) * k;
      K[0].rotation.x += (o0 - K[0].rotation.x) * k; K[0].userData.dirsek.rotation.x += (d0 - K[0].userData.dirsek.rotation.x) * k;
      K[0].rotation.z = ud.blk * 0.3;
    }
    // Ölüm: sırtüstü düşer
    ud.oluT = d.olu ? Math.min(1, ud.oluT + dt * 2.5) : Math.max(0, ud.oluT - dt * 4);
    ud.govde.rotation.x = -ud.oluT * Math.PI / 2;
    ud.govde.position.y = ud.oluT * 0.16 + (yuru > 0.05 ? Math.abs(Math.cos(ud.faz)) * 0.035 : 0);
    ud.govde.position.z = -ud.oluT * 0.1;
    if (ud.halka) ud.halka.visible = !d.olu;
  }
  function saldir(h) { h.userData.saldiriT = 0; }
  function zarAt(h) { h.userData.atisT = 0; }

  return { yap, giydir, oynat, saldir, zarAt, vitrin, silahYap, kalkanYap, kafaYap, TENLER, RENKLER, RENK_AD };
})();
