// ============================================================================
// js/models.js
// Dựng toàn bộ mô hình 3D chi tiết:
// 1. Mặt Trời Rực Rỡ 3D (Sun & Corona) + Bầu Trời Sao 3D (Starfield)
// 2. Đảo Đá Tự Nhiên Phủ Rêu & Bọt Sóng Vỗ Bờ (Rocky Island)
// 3. Ngọn Hải Đăng Kiến Trúc Cổ Điển & Hệ Thống Cửa Sổ Phát Sáng Rực Rỡ Ban Đêm
// 4. Thuyền Buồm Trắng Nổi Trên Sóng & Hạt Dạ Quang Sinh Học (Bioluminescent Plankton)
// 5. Đàn Chim Hải Âu 3D Chi Tiết Giải Phẫu (Thân thuôn, mắt xanh, mỏ vàng khoằm,
//    chân cam có màng, đuôi quạt xám và cánh khớp nối 2 đoạn trắng-xám-đen)
// ============================================================================

window.createRadialGlowTexture = function createRadialGlowTexture(innerColor, midColor, outerColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0.0, innerColor);
  grad.addColorStop(0.35, midColor);
  grad.addColorStop(1.0, outerColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
};

// 1. MẶT TRỜI 3D RỰC RỠ (BAN NGÀY) & TRƯỜNG SAO LẤP LÁNH (BAN ĐÊM)
window.buildSunAndStarfield = function buildSunAndStarfield(scene, isMobile) {
  const skyExtras = {
    sunGroup: new THREE.Group(),
    sunCoreMat: null,
    sunHaloInnerMat: null,
    sunHaloOuterMat: null,
    sunRayGroup: new THREE.Group(),
    starfieldPoints: null,
    starfieldMat: null
  };

  // Position matching sunDir in SKY_FRAGMENT_SHADER: normalize(vec3(0.42, 0.34, -0.84)) * 175
  skyExtras.sunGroup.position.set(73.5, 59.5, -147.0);
  skyExtras.sunGroup.lookAt(0, 8, 0);

  const sunGlowTex = window.createRadialGlowTexture(
    'rgba(255, 255, 245, 1.0)',
    'rgba(255, 220, 130, 0.65)',
    'rgba(255, 160, 40, 0.0)'
  );

  // Blazing solar disc
  skyExtras.sunCoreMat = new THREE.MeshBasicMaterial({
    color: 0xFFFDF2,
    transparent: true,
    opacity: 1.0,
    depthWrite: false
  });
  const sunCore = new THREE.Mesh(new THREE.CircleGeometry(7.2, 32), skyExtras.sunCoreMat);
  skyExtras.sunGroup.add(sunCore);

  // Inner golden corona sprite/plane
  skyExtras.sunHaloInnerMat = new THREE.MeshBasicMaterial({
    map: sunGlowTex,
    color: 0xFFE599,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const haloInner = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), skyExtras.sunHaloInnerMat);
  haloInner.position.z = 0.2;
  skyExtras.sunGroup.add(haloInner);

  // Wide atmospheric solar bloom
  skyExtras.sunHaloOuterMat = new THREE.MeshBasicMaterial({
    map: sunGlowTex,
    color: 0xFFB84D,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const haloOuter = new THREE.Mesh(new THREE.PlaneGeometry(78, 78), skyExtras.sunHaloOuterMat);
  haloOuter.position.z = 0.4;
  skyExtras.sunGroup.add(haloOuter);

  // Subtle rotating solar flare rays
  const rayMat = new THREE.MeshBasicMaterial({
    map: sunGlowTex,
    color: 0xFFF0B8,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (let r = 0; r < 6; r++) {
    const rayMesh = new THREE.Mesh(new THREE.PlaneGeometry(56, 3.2), rayMat);
    rayMesh.rotation.z = (r / 6) * Math.PI;
    skyExtras.sunRayGroup.add(rayMesh);
  }
  skyExtras.sunRayGroup.position.z = 0.3;
  skyExtras.sunGroup.add(skyExtras.sunRayGroup);
  scene.add(skyExtras.sunGroup);

  // 3D Starfield Dome for Night Sky
  const starCount = isMobile ? 900 : 1800;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    // Distribute across upper hemisphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.04 + Math.random() * 0.96);
    const radius = 195 + Math.random() * 15;
    const sx = radius * Math.sin(phi) * Math.cos(theta);
    const sy = radius * Math.cos(phi);
    const sz = radius * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3] = sx;
    starPos[i * 3 + 1] = sy;
    starPos[i * 3 + 2] = sz;

    // Tint stars between icy blue, pure white, warm gold, and cyan
    const t = Math.random();
    if (t < 0.45) {
      starCol[i * 3] = 0.78; starCol[i * 3 + 1] = 0.90; starCol[i * 3 + 2] = 1.0;
    } else if (t < 0.8) {
      starCol[i * 3] = 1.0; starCol[i * 3 + 1] = 0.98; starCol[i * 3 + 2] = 0.92;
    } else {
      starCol[i * 3] = 0.45; starCol[i * 3 + 1] = 0.92; starCol[i * 3 + 2] = 1.0;
    }
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));

  const starSpriteTex = window.createRadialGlowTexture(
    'rgba(255, 255, 255, 1.0)',
    'rgba(200, 235, 255, 0.6)',
    'rgba(0, 0, 0, 0.0)'
  );
  skyExtras.starfieldMat = new THREE.PointsMaterial({
    size: isMobile ? 1.8 : 2.2,
    map: starSpriteTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  skyExtras.starfieldPoints = new THREE.Points(starGeo, skyExtras.starfieldMat);
  scene.add(skyExtras.starfieldPoints);

  return skyExtras;
};

// 2. ĐẢO ĐÁ TỰ NHIÊN & NGỌN HẢI ĐĂNG KIẾN TRÚC PHÁT SÁNG BAN ĐÊM
window.buildIslandAndLighthouse = function buildIslandAndLighthouse(lighthouseGroup) {
  const matRockMain = new THREE.MeshStandardMaterial({
    color: 0x5A4A3C,
    roughness: 0.86,
    metalness: 0.06,
    flatShading: true
  });
  const matRockWet = new THREE.MeshStandardMaterial({
    color: 0x352B23,
    roughness: 0.5,
    metalness: 0.14,
    flatShading: true
  });
  const matMoss = new THREE.MeshStandardMaterial({
    color: 0x4A6B3B,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true
  });
  const matBrownStoneBase = new THREE.MeshStandardMaterial({
    color: 0x5C4938,
    roughness: 0.8,
    metalness: 0.08
  });
  const matBrickRed = new THREE.MeshStandardMaterial({
    color: 0xB83A2D,
    roughness: 0.54,
    metalness: 0.08
  });
  const matIvoryWhite = new THREE.MeshStandardMaterial({
    color: 0xF4EFE6,
    roughness: 0.48,
    metalness: 0.05
  });
  const matDomeRed = new THREE.MeshStandardMaterial({
    color: 0xA82E22,
    roughness: 0.38,
    metalness: 0.2
  });
  const matGreenGlass = new THREE.MeshPhysicalMaterial({
    color: 0x72C2D6,
    transparent: true,
    opacity: 0.5,
    roughness: 0.1,
    metalness: 0.1,
    reflectivity: 0.92
  });
  const matDarkMetal = new THREE.MeshStandardMaterial({
    color: 0x232B33,
    roughness: 0.36,
    metalness: 0.8
  });
  const matWarmLamp = new THREE.MeshBasicMaterial({
    color: 0xFFE8A3
  });

  // Glowing Window Pane Material (ramps up dramatically at night)
  const matWindowGlow = new THREE.MeshStandardMaterial({
    color: 0xFFEAB3,
    emissive: 0xFFA726,
    emissiveIntensity: 0.65,
    roughness: 0.15,
    metalness: 0.05
  });

  // Soft Additive Bloom Halo around each window at night
  const windowGlowTex = window.createRadialGlowTexture(
    'rgba(255, 220, 140, 0.95)',
    'rgba(255, 165, 50, 0.45)',
    'rgba(255, 120, 20, 0.0)'
  );
  const matWindowHalo = new THREE.MeshBasicMaterial({
    map: windowGlowTex,
    color: 0xFFC266,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // --- 2.1 Sculpted Natural Rocky Island ---
  const island = new THREE.Group();

  function sculptRockGeometry(geo, scaleY, noiseAmp) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i);
      let vy = pos.getY(i);
      let vz = pos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const dist = Math.sqrt(vx * vx + vz * vz);
      const n = Math.sin(angle * 5.0 + vy * 1.3) * 0.45 +
                Math.cos(angle * 3.0 - dist * 0.6) * 0.35 +
                Math.sin(vx * 0.9 + vz * 0.9) * 0.25;
      vx += Math.cos(angle) * n * noiseAmp;
      vz += Math.sin(angle) * n * noiseAmp;
      vy *= scaleY;
      if (vy < -0.5) vy = -0.5 + (vy + 0.5) * 0.3;
      pos.setXYZ(i, vx, vy, vz);
    }
    geo.computeVertexNormals();
    return geo;
  }

  const baseGeo = sculptRockGeometry(new THREE.CylinderGeometry(6.8, 9.3, 2.2, 28, 4), 1.0, 0.95);
  const baseRock = new THREE.Mesh(baseGeo, matRockWet);
  baseRock.position.y = 0.25;
  baseRock.receiveShadow = true;
  baseRock.castShadow = true;
  island.add(baseRock);

  const midGeo = sculptRockGeometry(new THREE.CylinderGeometry(4.3, 6.9, 2.5, 24, 4), 1.0, 0.72);
  const midRock = new THREE.Mesh(midGeo, matRockMain);
  midRock.position.y = 1.45;
  midRock.receiveShadow = true;
  midRock.castShadow = true;
  island.add(midRock);

  const mossGeo = sculptRockGeometry(new THREE.CylinderGeometry(3.5, 4.5, 0.75, 20, 2), 1.0, 0.42);
  const mossCap = new THREE.Mesh(mossGeo, matMoss);
  mossCap.position.y = 2.42;
  mossCap.receiveShadow = true;
  island.add(mossCap);

  const boulderConfigs = [
    { x: 5.2, y: 0.6, z: 3.1, sx: 2.1, sy: 1.3, sz: 1.8, moss: true },
    { x: -5.6, y: 0.5, z: 2.4, sx: 2.4, sy: 1.5, sz: 2.0, moss: true },
    { x: 3.4, y: 0.4, z: -5.2, sx: 2.5, sy: 1.2, sz: 2.1, moss: false },
    { x: -4.2, y: 0.7, z: -4.6, sx: 1.9, sy: 1.6, sz: 1.9, moss: true },
    { x: 7.4, y: 0.15, z: -1.4, sx: 1.7, sy: 0.9, sz: 1.5, moss: false },
    { x: -7.1, y: 0.2, z: -0.9, sx: 1.8, sy: 1.0, sz: 1.4, moss: false },
    { x: 0.8, y: 0.7, z: 6.1, sx: 2.2, sy: 1.1, sz: 1.7, moss: true }
  ];

  boulderConfigs.forEach((b, idx) => {
    const bGeo = sculptRockGeometry(new THREE.DodecahedronGeometry(1.0, 1), 1.0, 0.25);
    const bMesh = new THREE.Mesh(bGeo, idx % 2 === 0 ? matRockMain : matRockWet);
    bMesh.position.set(b.x, b.y, b.z);
    bMesh.scale.set(b.sx, b.sy, b.sz);
    bMesh.rotation.y = idx * 1.1;
    bMesh.castShadow = true;
    bMesh.receiveShadow = true;
    island.add(bMesh);

    if (b.moss) {
      const mMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), matMoss);
      mMesh.position.set(b.x, b.y + b.sy * 0.55, b.z);
      mMesh.scale.set(b.sx * 0.85, b.sy * 0.35, b.sz * 0.85);
      island.add(mMesh);
    }
  });

  // Carved stone stairway leading up to the arched entrance door (+Z side)
  for (let s = 0; s < 6; s++) {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(1.5 - s * 0.06, 0.22, 0.45),
      matBrownStoneBase
    );
    step.position.set(0, 1.55 + s * 0.2, 4.45 - s * 0.34);
    step.castShadow = true;
    step.receiveShadow = true;
    island.add(step);
  }
  lighthouseGroup.add(island);

  // --- 2.2 Lighthouse Architecture & Radiant Night Windows ---
  const tower = new THREE.Group();
  const tierHitMeshes = [];
  const tierHighlightRings = [];
  const tierAnchors3D = [];
  const windowPointLights = [];

  // Tầng 1: Chân tháp đá nâu & Cửa vòm có ô kính phát sáng
  const basePlinth = new THREE.Mesh(
    new THREE.CylinderGeometry(2.65, 3.05, 2.3, 28),
    matBrownStoneBase
  );
  basePlinth.position.y = 3.45;
  basePlinth.castShadow = true;
  basePlinth.receiveShadow = true;
  tower.add(basePlinth);

  const baseCornice = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.16, 12, 36),
    matBrownStoneBase
  );
  baseCornice.rotation.x = Math.PI / 2;
  baseCornice.position.y = 4.6;
  tower.add(baseCornice);

  // Entrance Archway & Door on +Z face
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 1.72, 0.46),
    matBrownStoneBase
  );
  doorFrame.position.set(0, 3.38, 2.75);
  tower.add(doorFrame);

  const woodenDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 1.4, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3D2314, roughness: 0.65 })
  );
  woodenDoor.position.set(0, 3.28, 2.77);
  tower.add(woodenDoor);

  // Glowing Arched Transom & Door Porthole Window
  const doorTransom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.52, 16, 1, false, 0, Math.PI),
    matWindowGlow
  );
  doorTransom.rotation.z = Math.PI / 2;
  doorTransom.rotation.y = Math.PI / 2;
  doorTransom.position.set(0, 4.0, 2.79);
  tower.add(doorTransom);

  const doorHalo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), matWindowHalo);
  doorHalo.position.set(0, 3.85, 3.08);
  tower.add(doorHalo);

  // Tầng 2, 3, 4, 5: Thân tháp sọc Đỏ Gạch - Trắng Ngà kèm Cửa Sổ Chia Ô Phát Sáng
  const stripeBands = [
    { tierId: 2, yBottom: 4.6, height: 2.2, rBottom: 2.52, rTop: 2.32, mat: matIvoryWhite, winAngle: 0.15 },
    { tierId: 3, yBottom: 6.8, height: 2.2, rBottom: 2.32, rTop: 2.12, mat: matBrickRed, winAngle: Math.PI / 3.2 },
    { tierId: 4, yBottom: 9.0, height: 2.1, rBottom: 2.12, rTop: 1.94, mat: matIvoryWhite, winAngle: -Math.PI / 4 },
    { tierId: 5, yBottom: 11.1, height: 2.1, rBottom: 1.94, rTop: 1.78, mat: matBrickRed, winAngle: Math.PI / 6 }
  ];

  stripeBands.forEach((band) => {
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(band.rTop, band.rBottom, band.height, 36),
      band.mat
    );
    const centerY = band.yBottom + band.height * 0.5;
    cyl.position.y = centerY;
    cyl.castShadow = true;
    cyl.receiveShadow = true;
    tower.add(cyl);

    // Architectural cornice ring between bands
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(band.rTop + 0.04, 0.075, 10, 36),
      band.mat === matBrickRed ? matIvoryWhite : matBrickRed
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = band.yBottom + band.height;
    tower.add(ring);

    // 3 Windows around each tier (0, 120°, 240°) so glowing windows are always visible from any angle
    [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].forEach((offset, wIdx) => {
      const ang = band.winAngle + offset;
      const rMid = (band.rBottom + band.rTop) * 0.5;
      const winGroup = new THREE.Group();

      // Outer deep frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.96, 0.24), matDarkMetal);
      // Arched top cap
      const archTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.31, 0.31, 0.24, 16, 1, false, 0, Math.PI),
        matDarkMetal
      );
      archTop.rotation.x = Math.PI / 2;
      archTop.position.y = 0.48;

      // Glowing warm golden glass pane
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.78, 0.27), matWindowGlow);
      const paneArch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.27, 16, 1, false, 0, Math.PI),
        matWindowGlow
      );
      paneArch.rotation.x = Math.PI / 2;
      paneArch.position.y = 0.39;

      // Mullion lattice bars (like classic cartoon/architectural lighthouse windows)
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.92, 0.29), matDarkMetal);
      const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.29), matDarkMetal);
      hBar1.position.y = 0.14;
      const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.29), matDarkMetal);
      hBar2.position.y = -0.18;

      // Protruding stone window sill
      const sill = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.36), matBrownStoneBase);
      sill.position.y = -0.5;

      // Soft glowing bloom sprite plane in front of window
      const haloPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.85), matWindowHalo);
      haloPlane.position.z = 0.18;

      winGroup.add(frame, archTop, pane, paneArch, vBar, hBar1, hBar2, sill, haloPlane);
      winGroup.position.set(Math.sin(ang) * (rMid - 0.01), centerY, Math.cos(ang) * (rMid - 0.01));
      winGroup.rotation.y = ang;
      tower.add(winGroup);

      // Attach a warm PointLight on the primary window of each tier to illuminate tower walls at night
      if (wIdx === 0) {
        const wLight = new THREE.PointLight(0xFFB347, 0.15, 6.5, 1.8);
        wLight.position.set(Math.sin(ang) * (rMid + 0.55), centerY, Math.cos(ang) * (rMid + 0.55));
        tower.add(wLight);
        windowPointLights.push(wLight);
      }
    });
  });

  // Tầng 6: Ban công & Lan can kim loại
  const corbelCone = new THREE.Mesh(
    new THREE.CylinderGeometry(2.26, 1.78, 0.65, 28),
    matIvoryWhite
  );
  corbelCone.position.y = 13.52;
  corbelCone.castShadow = true;
  tower.add(corbelCone);

  const galleryDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(2.44, 2.38, 0.32, 36),
    matBrownStoneBase
  );
  galleryDeck.position.y = 13.98;
  galleryDeck.castShadow = true;
  galleryDeck.receiveShadow = true;
  tower.add(galleryDeck);

  const railRadius = 2.32;
  const topRail = new THREE.Mesh(new THREE.TorusGeometry(railRadius, 0.045, 8, 36), matDarkMetal);
  topRail.rotation.x = Math.PI / 2;
  topRail.position.y = 14.85;
  tower.add(topRail);

  const midRail = new THREE.Mesh(new THREE.TorusGeometry(railRadius, 0.03, 8, 36), matDarkMetal);
  midRail.rotation.x = Math.PI / 2;
  midRail.position.y = 14.48;
  tower.add(midRail);

  const postCount = 24;
  const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.76, 8);
  for (let i = 0; i < postCount; i++) {
    const a = (i / postCount) * Math.PI * 2;
    const post = new THREE.Mesh(postGeo, matDarkMetal);
    post.position.set(Math.cos(a) * railRadius, 14.48, Math.sin(a) * railRadius);
    tower.add(post);
  }

  // Tầng 7: Phòng đèn kính xanh, Thấu kính Fresnel xoay & Mái vòm đỏ
  const lanternBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.62, 1.68, 0.55, 24),
    matDarkMetal
  );
  lanternBase.position.y = 14.38;
  tower.add(lanternBase);

  const glassCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(1.56, 1.56, 1.85, 24, 1, false),
    matGreenGlass
  );
  glassCylinder.position.y = 15.55;
  tower.add(glassCylinder);

  const mullionGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.88, 6);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const mullion = new THREE.Mesh(mullionGeo, matDarkMetal);
    mullion.position.set(Math.cos(a) * 1.58, 15.55, Math.sin(a) * 1.58);
    tower.add(mullion);
  }

  const domeRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.68, 0.08, 10, 32),
    matDarkMetal
  );
  domeRim.rotation.x = Math.PI / 2;
  domeRim.position.y = 16.48;
  tower.add(domeRim);

  const redDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.64, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.52),
    matDomeRed
  );
  redDome.position.y = 16.45;
  redDome.castShadow = true;
  tower.add(redDome);

  for (let i = 0; i < 8; i++) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.03, 6, 20, Math.PI * 0.5),
      matDarkMetal
    );
    rib.position.y = 16.45;
    rib.rotation.y = (i / 8) * Math.PI * 2;
    tower.add(rib);
  }

  const cupolaBall = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), matDomeRed);
  cupolaBall.position.y = 18.18;
  tower.add(cupolaBall);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 1.05, 8), matDarkMetal);
  spire.position.y = 18.72;
  tower.add(spire);

  // Fresnel Lens & Volumetric Light Beams
  const lanternHeadGroup = new THREE.Group();
  lanternHeadGroup.position.set(0, 15.55, 0);
  tower.add(lanternHeadGroup);

  const lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 20), matWarmLamp);
  lanternHeadGroup.add(lampCore);

  const lampHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 3.6),
    new THREE.MeshBasicMaterial({
      map: windowGlowTex,
      color: 0xFFD97D,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  lanternHeadGroup.add(lampHalo);

  const fresnelCage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 1.08, 12, 2, true),
    new THREE.MeshBasicMaterial({ color: 0xFFD27D, wireframe: true, transparent: true, opacity: 0.8 })
  );
  lanternHeadGroup.add(fresnelCage);

  const lighthousePointLight = new THREE.PointLight(0xFFD27D, 2.8, 48, 1.5);
  lanternHeadGroup.add(lighthousePointLight);

  const lighthouseSpotLight = new THREE.SpotLight(0xFFD27D, 4.8, 115, Math.PI / 5, 0.65, 1.2);
  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, -6.5, 38);
  lanternHeadGroup.add(spotTarget);
  lighthouseSpotLight.target = spotTarget;
  lanternHeadGroup.add(lighthouseSpotLight);

  const beamGeo = new THREE.ConeGeometry(7.5, 44, 28, 1, true);
  beamGeo.translate(0, -22, 0);
  beamGeo.rotateX(-Math.PI / 2 - 0.14);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xFFD27D,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const volumetricBeamMesh1 = new THREE.Mesh(beamGeo, beamMat);
  lanternHeadGroup.add(volumetricBeamMesh1);

  const beamGeo2 = beamGeo.clone();
  beamGeo2.rotateY(Math.PI);
  const volumetricBeamMesh2 = new THREE.Mesh(beamGeo2, beamMat);
  lanternHeadGroup.add(volumetricBeamMesh2);

  // 7 Interactive Tier Hitboxes & Selection Rings
  const tierDefinitions = [
    { id: 1, y: 3.4, r: 2.95, h: 2.2, pinOffset: new THREE.Vector3(2.8, 3.4, 1.2) },
    { id: 2, y: 5.7, r: 2.52, h: 2.1, pinOffset: new THREE.Vector3(-2.5, 5.7, 1.0) },
    { id: 3, y: 7.9, r: 2.32, h: 2.1, pinOffset: new THREE.Vector3(2.3, 7.9, 0.8) },
    { id: 4, y: 10.0, r: 2.12, h: 2.0, pinOffset: new THREE.Vector3(-2.1, 10.0, -0.8) },
    { id: 5, y: 12.1, r: 1.94, h: 2.0, pinOffset: new THREE.Vector3(1.95, 12.1, -0.6) },
    { id: 6, y: 14.3, r: 2.45, h: 1.3, pinOffset: new THREE.Vector3(-2.35, 14.3, 0.7) },
    { id: 7, y: 16.2, r: 1.85, h: 2.6, pinOffset: new THREE.Vector3(1.85, 16.4, 0.5) }
  ];

  tierDefinitions.forEach((td) => {
    const hitMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(td.r * 1.06, td.r * 1.08, td.h, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.y = td.y;
    hitMesh.userData = { tierId: td.id };
    tower.add(hitMesh);
    tierHitMeshes.push(hitMesh);

    const hRing = new THREE.Mesh(
      new THREE.TorusGeometry(td.r * 1.04, 0.065, 10, 36),
      new THREE.MeshBasicMaterial({
        color: 0xFFD27D,
        transparent: true,
        opacity: 0.0
      })
    );
    hRing.rotation.x = Math.PI / 2;
    hRing.position.y = td.y;
    tower.add(hRing);
    tierHighlightRings.push(hRing);

    const anchor = new THREE.Object3D();
    anchor.position.copy(td.pinOffset);
    tower.add(anchor);
    tierAnchors3D.push({ id: td.id, obj: anchor });
  });

  lighthouseGroup.add(tower);

  return {
    tierHitMeshes,
    tierHighlightRings,
    tierAnchors3D,
    lanternHeadGroup,
    lighthousePointLight,
    lighthouseSpotLight,
    volumetricBeamMesh1,
    volumetricBeamMesh2,
    matWindowGlow,
    matWindowHalo,
    windowPointLights
  };
};

// 3. THUYỀN BUỒM TRẮNG NỔI TRÊN ĐẠI DƯƠNG
window.buildSailboatModel = function buildSailboatModel(worldGroup) {
  const sailboatGroup = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({ color: 0xF7F4EE, roughness: 0.35, metalness: 0.08 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x7A3E26, roughness: 0.55 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.4,
    side: THREE.DoubleSide
  });

  const hullGeo = new THREE.CylinderGeometry(0.68, 0.35, 3.4, 16);
  hullGeo.rotateZ(Math.PI / 2);
  hullGeo.scale(1.15, 0.52, 0.58);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.16;
  hull.castShadow = true;
  hull.receiveShadow = true;
  sailboatGroup.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 1.15), trimMat);
  deck.position.y = 0.34;
  sailboatGroup.add(deck);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.72), hullMat);
  cabin.position.set(-0.2, 0.52, 0);
  sailboatGroup.add(cabin);

  // Small warm cabin lantern on the sailboat for night visibility
  const boatLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xFFD27D })
  );
  boatLantern.position.set(0.42, 0.62, 0);
  sailboatGroup.add(boatLantern);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 4.5, 10), trimMat);
  mast.position.set(0.15, 2.55, 0);
  mast.castShadow = true;
  sailboatGroup.add(mast);

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 8), trimMat);
  boom.rotation.z = Math.PI / 2;
  boom.position.set(-0.85, 0.85, 0);
  sailboatGroup.add(boom);

  const mainSailGeo = new THREE.BufferGeometry();
  const mainVerts = new Float32Array([
    0.12, 4.65, 0.0,
    0.12, 0.90, 0.0,
    -1.88, 0.90, 0.28
  ]);
  mainSailGeo.setAttribute('position', new THREE.BufferAttribute(mainVerts, 3));
  mainSailGeo.computeVertexNormals();
  const mainSailMesh = new THREE.Mesh(mainSailGeo, sailMat);
  mainSailMesh.castShadow = true;
  sailboatGroup.add(mainSailMesh);

  const jibGeo = new THREE.BufferGeometry();
  const jibVerts = new Float32Array([
    0.18, 4.35, 0.0,
    0.18, 0.95, 0.0,
    1.75, 0.65, 0.22
  ]);
  jibGeo.setAttribute('position', new THREE.BufferAttribute(jibVerts, 3));
  jibGeo.computeVertexNormals();
  const jibSailMesh = new THREE.Mesh(jibGeo, sailMat);
  jibSailMesh.castShadow = true;
  sailboatGroup.add(jibSailMesh);

  sailboatGroup.position.set(11.8, 0, 6.2);
  worldGroup.add(sailboatGroup);

  return { sailboatGroup, mainSailMesh, jibSailMesh };
};

// 4. ĐÀN CHIM HẢI ÂU 3D CHI TIẾT GIẢI PHẪU (THEO ẢNH MẪU image_563e9e.jpg)
// Thân trắng thuôn khí động học, đầu có gờ mày + mắt xanh lá, mỏ vàng cam khoằm,
// đôi chân màng màu cam thu gọn dưới bụng, đuôi xòe quạt xám-đen, và cánh 2 khớp nối
// (Inner Wing + Outer WingTip) phối màu trắng - xám đậm - chóp đen.
window.buildDetailedSeagulls = function buildDetailedSeagulls(worldGroup) {
  const seagullsGroup = new THREE.Group();
  worldGroup.add(seagullsGroup);
  const seagulls = [];

  const matWhiteFeather = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.42,
    metalness: 0.02,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  });
  const matGreyMantle = new THREE.MeshStandardMaterial({
    color: 0x64748B,
    roughness: 0.48,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  });
  const matDarkWingtip = new THREE.MeshStandardMaterial({
    color: 0x1E293B,
    roughness: 0.5,
    transparent: true,
    opacity: 1.0,
    side: THREE.DoubleSide
  });
  const matGoldenBeak = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    roughness: 0.35,
    transparent: true,
    opacity: 1.0
  });
  const matOrangeFeet = new THREE.MeshStandardMaterial({
    color: 0xEA580C,
    roughness: 0.45,
    transparent: true,
    opacity: 1.0
  });
  const matGreenEye = new THREE.MeshBasicMaterial({
    color: 0x22C55E
  });
  const matBlackPupil = new THREE.MeshBasicMaterial({
    color: 0x090D16
  });

  const sharedMats = [matWhiteFeather, matGreyMantle, matDarkWingtip, matGoldenBeak, matOrangeFeet];

  function createSingleDetailedGull() {
    const bird = new THREE.Group();

    // 1. Plump Aerodynamic White Body (oriented along +Z forward)
    const torsoGeo = new THREE.SphereGeometry(0.16, 16, 14);
    torsoGeo.scale(0.88, 0.78, 2.35);
    const torso = new THREE.Mesh(torsoGeo, matWhiteFeather);
    torso.castShadow = true;
    bird.add(torso);

    // 2. Sculpted Head & Prominent Brow Ridge
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.08, 0.34);

    const skullGeo = new THREE.SphereGeometry(0.115, 14, 12);
    skullGeo.scale(0.88, 0.92, 1.22);
    const skull = new THREE.Mesh(skullGeo, matWhiteFeather);
    headGroup.add(skull);

    // Expressive sculpted brow ridges & green eyes on both sides
    [-1, 1].forEach((side) => {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.028, 0.09), matWhiteFeather);
      brow.position.set(side * 0.082, 0.042, 0.03);
      brow.rotation.z = side * -0.25;
      headGroup.add(brow);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), matGreenEye);
      iris.position.set(side * 0.088, 0.015, 0.035);
      headGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), matBlackPupil);
      pupil.position.set(side * 0.098, 0.015, 0.042);
      headGroup.add(pupil);
    });

    // 3. Long Curved Yellow-Orange Beak with Hooked Tip
    const upperBeak = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.24, 10),
      matGoldenBeak
    );
    upperBeak.rotation.x = Math.PI / 2 + 0.12;
    upperBeak.scale.set(0.75, 1.0, 0.85);
    upperBeak.position.set(0, -0.01, 0.21);
    headGroup.add(upperBeak);

    // Hooked beak tip pointing slightly downward
    const beakHook = new THREE.Mesh(
      new THREE.ConeGeometry(0.024, 0.075, 8),
      matGoldenBeak
    );
    beakHook.rotation.x = Math.PI * 0.72;
    beakHook.position.set(0, -0.038, 0.32);
    headGroup.add(beakHook);

    bird.add(headGroup);

    // 4. Flared Grey-and-Black Fan Tail at rear (-Z)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.02, -0.35);
    for (let f = -2; f <= 2; f++) {
      const feather = new THREE.Mesh(
        new THREE.BoxGeometry(0.048, 0.014, 0.22),
        Math.abs(f) === 2 ? matDarkWingtip : matGreyMantle
      );
      feather.position.set(f * 0.026, 0, -0.08);
      feather.rotation.y = f * 0.14;
      tailGroup.add(feather);
    }
    bird.add(tailGroup);

    // 5. Tucked Webbed Orange Feet underneath rear belly
    [-1, 1].forEach((side) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.065, -0.11, -0.18);
      legGroup.rotation.x = 0.42;

      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.01, 0.14, 6), matOrangeFeet);
      shank.rotation.x = Math.PI / 2;
      legGroup.add(shank);

      const webbedFoot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.08), matOrangeFeet);
      webbedFoot.position.set(0, -0.01, -0.07);
      legGroup.add(webbedFoot);

      bird.add(legGroup);
    });

    // 6. Articulated 2-Segment Wings (Shoulder -> Inner Wing -> Elbow -> Outer Wingtip)
    function createArticulatedWing(side) {
      // side: 1 = Left (+X), -1 = Right (-X)
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(side * 0.11, 0.04, 0.04);

      // Inner wing (white leading edge + grey secondary feathers)
      const innerLen = 0.44;
      const innerWhite = new THREE.Mesh(
        new THREE.BoxGeometry(innerLen, 0.026, 0.14),
        matWhiteFeather
      );
      innerWhite.position.set(side * (innerLen * 0.5), 0, 0.04);
      innerWhite.rotation.y = side * -0.12;
      shoulderPivot.add(innerWhite);

      const innerGrey = new THREE.Mesh(
        new THREE.BoxGeometry(innerLen * 0.96, 0.02, 0.13),
        matGreyMantle
      );
      innerGrey.position.set(side * (innerLen * 0.48), -0.004, -0.06);
      innerGrey.rotation.y = side * -0.12;
      shoulderPivot.add(innerGrey);

      // Elbow joint at the end of inner wing
      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(side * innerLen, 0, -0.02);
      shoulderPivot.add(elbowPivot);

      // Outer swept wingtip (white leading bar + dark charcoal primary feathers)
      const outerLen = 0.48;
      const outerWhiteEdge = new THREE.Mesh(
        new THREE.BoxGeometry(outerLen * 0.85, 0.022, 0.08),
        matWhiteFeather
      );
      outerWhiteEdge.position.set(side * (outerLen * 0.42), 0, 0.01);
      outerWhiteEdge.rotation.y = side * -0.32;
      elbowPivot.add(outerWhiteEdge);

      const outerDarkTip = new THREE.Mesh(
        new THREE.BoxGeometry(outerLen, 0.018, 0.13),
        matDarkWingtip
      );
      outerDarkTip.position.set(side * (outerLen * 0.48), -0.003, -0.055);
      outerDarkTip.rotation.y = side * -0.34;
      elbowPivot.add(outerDarkTip);

      return { shoulderPivot, elbowPivot };
    }

    const leftWing = createArticulatedWing(1);
    const rightWing = createArticulatedWing(-1);
    bird.add(leftWing.shoulderPivot, rightWing.shoulderPivot);

    return {
      bird,
      leftShoulder: leftWing.shoulderPivot,
      leftElbow: leftWing.elbowPivot,
      rightShoulder: rightWing.shoulderPivot,
      rightElbow: rightWing.elbowPivot
    };
  }

  for (let i = 0; i < 11; i++) {
    const gullObj = createSingleDetailedGull();
    const radius = 8.2 + (i % 4) * 3.4;
    const baseHeight = 8.5 + (i % 5) * 2.1;
    const speed = 0.34 + (i % 3) * 0.07;
    const phase = (i / 11) * Math.PI * 2;
    const scale = i < 3 ? 1.45 : 0.95 + (i % 3) * 0.18;
    gullObj.bird.scale.setScalar(scale);

    seagullsGroup.add(gullObj.bird);
    seagulls.push({
      group: gullObj.bird,
      leftShoulder: gullObj.leftShoulder,
      leftElbow: gullObj.leftElbow,
      rightShoulder: gullObj.rightShoulder,
      rightElbow: gullObj.rightElbow,
      radius,
      baseHeight,
      speed,
      phase
    });
  }

  return { seagullsGroup, seagulls, sharedMats };
};

// 5. HỆ THỐNG HẠT DẠ QUANG SINH HỌC TRÊN MẶT BIỂN ĐÊM (BIOLUMINESCENT PLANKTON)
window.buildBioluminescentPlankton = function buildBioluminescentPlankton(scene, isMobile) {
  const count = isMobile ? 650 : 1400;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const baseCoords = new Float32Array(count * 3); // x, z, phase

  for (let i = 0; i < count; i++) {
    // Concentrate around shoreline (r = 7.5..36) and wave crests
    const r = 7.2 + Math.pow(Math.random(), 1.35) * 42.0;
    const a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const phase = Math.random() * Math.PI * 2;

    baseCoords[i * 3] = x;
    baseCoords[i * 3 + 1] = z;
    baseCoords[i * 3 + 2] = phase;

    positions[i * 3] = x;
    positions[i * 3 + 1] = 0.2;
    positions[i * 3 + 2] = z;

    // Electric cyan & bioluminescent aqua hues
    const mixVal = Math.random();
    colors[i * 3] = 0.0 + mixVal * 0.22;
    colors[i * 3 + 1] = 0.82 + mixVal * 0.18;
    colors[i * 3 + 2] = 1.0;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const glowTex = window.createRadialGlowTexture(
    'rgba(180, 255, 255, 1.0)',
    'rgba(0, 229, 255, 0.75)',
    'rgba(0, 120, 255, 0.0)'
  );

  const mat = new THREE.PointsMaterial({
    size: isMobile ? 0.55 : 0.68,
    map: glowTex,
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const points = new THREE.Points(geo, mat);
  scene.add(points);

  return { points, geo, mat, baseCoords, count };
};
