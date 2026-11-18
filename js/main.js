// ============================================================================
// js/main.js
// Khởi tạo Scene 3D, Ánh sáng, Đại dương Dạ quang, Điều khiển xoay 0°–360°,
// Chuyển tiếp Ngày (Mặt Trời & Hải Âu) <-> Đêm (Ngân Hà, Biển Xanh Dạ Quang &
// Cửa Sổ Hải Đăng Phát Sáng), Raycasting 7 Tầng Nghị Luận và Vòng lặp Animation.
// ============================================================================

(function () {
  const LIGHTHOUSE_TIERS = window.LIGHTHOUSE_TIERS;
  const audioManager = window.audioManager;
  const getWaveHeight = window.getWaveHeight;
  const getBioluminescentGlow = window.getBioluminescentGlow;

  // 1. KHỞI TẠO SCENE, CAMERA & RENDERER
  const container = document.getElementById('canvas-container');
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x9BC7E6, 0.0058);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 420);
  camera.position.set(0, 14.5, 48);
  const cameraLookTarget = new THREE.Vector3(0, 8.2, 0);
  camera.lookAt(cameraLookTarget);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false
  });
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
  let currentQuality = isMobile ? 'balanced' : 'high';
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2.0));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  // 2. BẦU TRỜI KHÍ QUYỂN ĐỘNG (NGÀY RỰC NẮNG <-> ĐÊM NGÂN HÀ & SAO LẤP LÁNH)
  const skyUniforms = {
    uStorm: { value: 0.0 },
    uTime: { value: 0.0 },
    uLightning: { value: 0.0 },
    uSunZenith: { value: new THREE.Color('#1B6CA8') },
    uSunHorizon: { value: new THREE.Color('#C9ECFA') },
    uStormZenith: { value: new THREE.Color('#030812') },
    uStormHorizon: { value: new THREE.Color('#0F2744') }
  };

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: window.SKY_VERTEX_SHADER,
    fragmentShader: window.SKY_FRAGMENT_SHADER
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(225, 36, 28), skyMat);
  scene.add(skyDome);

  // Build 3D Sun Disc + Corona & Night Starfield
  const skyExtras = window.buildSunAndStarfield(scene, isMobile);

  // 3. HỆ THỐNG ÁNH SÁNG ĐIỆN ẢNH (CINEMATIC LIGHTING)
  const hemiLight = new THREE.HemisphereLight(0xE6F4FF, 0x3D586B, 0.96);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xFFF3D6, 1.42);
  sunLight.position.set(28, 36, 22);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = isMobile ? 1024 : 2048;
  sunLight.shadow.mapSize.height = isMobile ? 1024 : 2048;
  sunLight.shadow.camera.near = 5;
  sunLight.shadow.camera.far = 95;
  const d = 22;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0005;
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight(0x38BDF8, 0.48);
  rimLight.position.set(-24, 16, -20);
  scene.add(rimLight);

  const lightningFlashLight = new THREE.PointLight(0xBFD9FF, 0, 180);
  lightningFlashLight.position.set(-35, 38, -55);
  scene.add(lightningFlashLight);

  // 4. DỰNG ĐẢO ĐÁ, NGỌN HẢI ĐĂNG CỬA SỔ PHÁT SÁNG, THUYỀN BUỒM & CHIM HẢI ÂU 3D
  const lighthouseGroup = new THREE.Group();
  worldGroup.add(lighthouseGroup);

  const lighthouseData = window.buildIslandAndLighthouse(lighthouseGroup);
  const {
    tierHitMeshes,
    tierHighlightRings,
    tierAnchors3D,
    lanternHeadGroup,
    lighthousePointLight,
    lighthouseSpotLight,
    volumetricBeamMesh1,
    matWindowGlow,
    matWindowHalo,
    windowPointLights
  } = lighthouseData;

  const { sailboatGroup, mainSailMesh } = window.buildSailboatModel(worldGroup);
  const { seagullsGroup, seagulls, sharedMats: gullSharedMats } = window.buildDetailedSeagulls(worldGroup);
  const biolumPlankton = window.buildBioluminescentPlankton(scene, isMobile);

  // 5. ĐẠI DƯƠNG 3D ĐỘNG & HIỆU ỨNG XANH DẠ QUANG BAN ĐÊM (BIOLUMINESCENT OCEAN)
  let currentStormFactor = 0.0;

  const oceanSegs = isMobile ? 84 : 132;
  const oceanGeo = new THREE.PlaneGeometry(240, 240, oceanSegs, oceanSegs);
  oceanGeo.rotateX(-Math.PI / 2);

  const vCount = oceanGeo.attributes.position.count;
  const oceanColors = new Float32Array(vCount * 3);
  const oceanBaseX = new Float32Array(vCount);
  const oceanBaseZ = new Float32Array(vCount);
  for (let i = 0; i < vCount; i++) {
    oceanBaseX[i] = oceanGeo.attributes.position.getX(i);
    oceanBaseZ[i] = oceanGeo.attributes.position.getZ(i);
  }
  oceanGeo.setAttribute('color', new THREE.BufferAttribute(oceanColors, 3));

  const oceanMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.2,
    metalness: 0.35,
    flatShading: false
  });
  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.receiveShadow = true;
  scene.add(oceanMesh);

  // Shoreline Foam Rings (White foam in Day -> Glowing Bioluminescent Cyan in Night)
  const foamRings = [];
  const colFoamDay = new THREE.Color('#FFFFFF');
  const colFoamNightBiolum = new THREE.Color('#00F0FF');

  for (let i = 0; i < 4; i++) {
    const fGeo = new THREE.RingGeometry(7.1 + i * 0.92, 7.62 + i * 0.98, 56);
    fGeo.rotateX(-Math.PI / 2);
    const fMat = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.44 - i * 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const fMesh = new THREE.Mesh(fGeo, fMat);
    fMesh.position.y = 0.16;
    worldGroup.add(fMesh);
    foamRings.push({ mesh: fMesh, mat: fMat, phase: i * 1.85, baseR: 1.0 + i * 0.08, baseOp: 0.44 - i * 0.08 });
  }

  // 6. HỆ THỐNG MÂY ĐA TẦNG, MƯA ĐÊM & SẤM CHỚP
  const cloudsGroup = new THREE.Group();
  scene.add(cloudsGroup);
  const cloudClusters = [];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.92,
    metalness: 0.0,
    transparent: true,
    opacity: 0.86
  });

  function buildClouds() {
    const puffGeo = new THREE.DodecahedronGeometry(1.0, 1);
    for (let c = 0; c < 16; c++) {
      const cluster = new THREE.Group();
      const puffs = 4 + (c % 3);
      for (let p = 0; p < puffs; p++) {
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (p - puffs * 0.5) * 3.2 + (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 2.2
        );
        const s = 2.5 + Math.random() * 2.1;
        puff.scale.set(s * 1.4, s * 0.72, s);
        cluster.add(puff);
      }
      const angle = (c / 16) * Math.PI * 2;
      const dist = 52 + (c % 3) * 22;
      const y = 25 + (c % 4) * 5;
      cluster.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist);
      cluster.lookAt(0, y, 0);
      cloudsGroup.add(cluster);
      cloudClusters.push({ group: cluster, angle, dist, baseY: y, speed: 0.014 + (c % 4) * 0.005 });
    }
  }
  buildClouds();

  // Slanted 3D Rain Particle System
  const rainCount = isMobile ? 800 : 1600;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const rx = (Math.random() - 0.5) * 70;
    const ry = Math.random() * 38;
    const rz = (Math.random() - 0.5) * 70;
    const idx = i * 6;
    rainPositions[idx] = rx;
    rainPositions[idx + 1] = ry;
    rainPositions[idx + 2] = rz;
    rainPositions[idx + 3] = rx - 0.45;
    rainPositions[idx + 4] = ry - 1.55;
    rainPositions[idx + 5] = rz - 0.2;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.LineBasicMaterial({
    color: 0xB8D4F2,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  const rainLines = new THREE.LineSegments(rainGeo, rainMat);
  scene.add(rainLines);

  // Distant Horizon Lightning Bolt
  const boltPoints = [
    new THREE.Vector3(-28, 46, -65),
    new THREE.Vector3(-25, 36, -65),
    new THREE.Vector3(-29, 29, -65),
    new THREE.Vector3(-24, 18, -65),
    new THREE.Vector3(-27, 9, -65),
    new THREE.Vector3(-23, 0, -65)
  ];
  const boltGeo = new THREE.BufferGeometry().setFromPoints(boltPoints);
  const boltMat = new THREE.LineBasicMaterial({
    color: 0xE6F2FF,
    transparent: true,
    opacity: 0.0
  });
  const lightningBolt = new THREE.Line(boltGeo, boltMat);
  scene.add(lightningBolt);

  // Bioluminescent Sea Mist Ring around Island at Night
  const seaMistMat = new THREE.MeshBasicMaterial({
    color: 0x00B4D8,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const seaMistPlane = new THREE.Mesh(new THREE.RingGeometry(5.5, 26, 36), seaMistMat);
  seaMistPlane.rotation.x = -Math.PI / 2;
  seaMistPlane.position.y = 0.65;
  scene.add(seaMistPlane);

  // 7. CƠ CHẾ XOAY 360° & NỘI SUY NGÀY / ĐÊM DẠ QUANG LIÊN TỤC
  let targetWorldAngle = 0;
  let currentWorldAngle = 0;
  let normalizedAngle = 0;
  let isDragging = false;
  let pointerDownPos = { x: 0, y: 0 };
  let prevPointerX = 0;
  let dragVelocity = 0;
  let hasDismissedHint = false;
  let activeTierId = null;

  const colFogDay = new THREE.Color('#9AC7E6');
  const colFogNight = new THREE.Color('#061224');
  const colSunDay = new THREE.Color('#FFF1D6');
  const colSunNight = new THREE.Color('#2B587A');
  const colHemiSkyDay = new THREE.Color('#E6F4FF');
  const colHemiSkyNight = new THREE.Color('#13294B');
  const colHemiGroundDay = new THREE.Color('#3D6B82');
  const colHemiGroundNight = new THREE.Color('#04101E');
  const colCloudDay = new THREE.Color('#FFFFFF');
  const colCloudNight = new THREE.Color('#1A293B');

  const colOceanDeepDay = new THREE.Color('#126A94');
  const colOceanShallowDay = new THREE.Color('#24B6C9');
  const colOceanDeepNight = new THREE.Color('#030B17');
  const colOceanShallowNight = new THREE.Color('#07223B');
  const colFoam = new THREE.Color('#F2F8FF');
  const colBiolumCyan = new THREE.Color('#00F0FF');
  const colSunSpec = new THREE.Color('#FFF0B3');
  const tempColor = new THREE.Color();
  const tempShallow = new THREE.Color();

  function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function updateEnvironmentByAngle(deg, elapsedTime) {
    normalizedAngle = ((deg % 360) + 360) % 360;
    const rad = THREE.MathUtils.degToRad(normalizedAngle);

    // 0 at 0° (Day), 0.5 at 90°/270° (Twilight), 1.0 at 180° (Night & Bioluminescent Sea)
    const rawCos = 0.5 * (1.0 - Math.cos(rad));
    currentStormFactor = smoothstep(0.0, 1.0, rawCos);

    worldGroup.rotation.y = THREE.MathUtils.degToRad(deg);

    // 1. Sky Shader & Fog
    skyUniforms.uStorm.value = currentStormFactor;
    skyUniforms.uTime.value = elapsedTime;
    scene.fog.color.copy(colFogDay).lerp(colFogNight, currentStormFactor);
    scene.fog.density = 0.0052 + currentStormFactor * 0.0085;

    // 2. 3D Radiant Sun (Day) & Twinkling 3D Starfield (Night)
    const sunVis = Math.max(0, 1.0 - smoothstep(0.08, 0.58, currentStormFactor));
    skyExtras.sunGroup.visible = sunVis > 0.01;
    skyExtras.sunCoreMat.opacity = sunVis;
    skyExtras.sunHaloInnerMat.opacity = sunVis * 0.92;
    skyExtras.sunHaloOuterMat.opacity = sunVis * 0.55;
    skyExtras.sunGroup.position.y = 59.5 - (1.0 - sunVis) * 28.0;
    skyExtras.sunRayGroup.rotation.z = elapsedTime * 0.08;

    const starVis = smoothstep(0.25, 0.85, currentStormFactor);
    skyExtras.starfieldPoints.visible = starVis > 0.01 && currentQuality !== 'performance';
    skyExtras.starfieldMat.opacity = starVis * (0.78 + 0.22 * Math.sin(elapsedTime * 1.9));
    skyExtras.starfieldPoints.rotation.y = elapsedTime * 0.006;

    // 3. Ambient & Directional Lighting
    sunLight.color.copy(colSunDay).lerp(colSunNight, currentStormFactor);
    sunLight.intensity = 1.42 * (1.0 - currentStormFactor * 0.76);
    hemiLight.color.copy(colHemiSkyDay).lerp(colHemiSkyNight, currentStormFactor);
    hemiLight.groundColor.copy(colHemiGroundDay).lerp(colHemiGroundNight, currentStormFactor);
    hemiLight.intensity = 0.96 - currentStormFactor * 0.52;

    // 4. Clouds
    cloudMat.color.copy(colCloudDay).lerp(colCloudNight, currentStormFactor);
    cloudMat.opacity = 0.84 * (1.0 - currentStormFactor * 0.25);

    // 5. Detailed 3D Seagulls (Soaring in Daylight, fade out at Night/Storm)
    const gullAlpha = Math.max(0, 1.0 - smoothstep(0.18, 0.68, currentStormFactor));
    seagullsGroup.visible = gullAlpha > 0.02 && currentQuality !== 'performance';
    gullSharedMats.forEach((m) => {
      m.opacity = gullAlpha;
    });

    // 6. Night Rain & Bioluminescent Sea Mist
    const rainIntensity = smoothstep(0.42, 0.95, currentStormFactor);
    rainLines.visible = rainIntensity > 0.01;
    rainMat.opacity = rainIntensity * 0.45;
    seaMistMat.opacity = smoothstep(0.3, 0.95, currentStormFactor) * 0.22;

    // 7. Bioluminescent Plankton Particles on Night Ocean
    const biolumAlpha = smoothstep(0.22, 0.85, currentStormFactor);
    biolumPlankton.points.visible = biolumAlpha > 0.01 && currentQuality !== 'performance';
    biolumPlankton.mat.opacity = biolumAlpha * 0.88;

    // 8. Lighthouse Glowing Windows & Sweeping Lantern Beams at Night
    const windowGlowPulse = 1.0 + 0.08 * Math.sin(elapsedTime * 3.2);
    matWindowGlow.emissiveIntensity = (0.45 + currentStormFactor * 2.65) * windowGlowPulse;
    matWindowHalo.opacity = (0.06 + currentStormFactor * 0.78) * windowGlowPulse;
    windowPointLights.forEach((wl) => {
      wl.intensity = 0.1 + currentStormFactor * 1.45;
    });

    const beamAlpha = 0.1 + currentStormFactor * 0.32;
    if (volumetricBeamMesh1) volumetricBeamMesh1.material.opacity = beamAlpha;
    if (lighthousePointLight) lighthousePointLight.intensity = 1.9 + currentStormFactor * 3.1;
    if (lighthouseSpotLight) lighthouseSpotLight.intensity = 3.4 + currentStormFactor * 5.8;

    // 9. Update HUD & Body Night Class
    document.body.classList.toggle('night-mode-hud', currentStormFactor > 0.55);
    updateWeatherHUD(Math.round(normalizedAngle) % 360, currentStormFactor);
  }

  let lastHudAngle = -1;
  function updateWeatherHUD(intAngle, storm) {
    if (intAngle === lastHudAngle) return;
    lastHudAngle = intAngle;

    const angleEl = document.getElementById('angle-readout');
    const phaseEl = document.getElementById('world-phase-label');
    const detailEl = document.getElementById('weather-detail-label');
    const headerStatus = document.getElementById('header-world-status');
    const dotEl = document.getElementById('weather-dot');
    const sliderEl = document.getElementById('angle-slider');

    if (angleEl) angleEl.textContent = `${intAngle}°`;
    if (sliderEl && !isDragging) sliderEl.value = String(intAngle);

    if (storm < 0.22) {
      if (phaseEl) phaseEl.textContent = 'Ban Ngày • Mặt Trời Rực Rỡ';
      if (detailEl) detailEl.textContent = 'Mặt trời tỏa nắng • Hải âu vỗ cánh • Biển xanh';
      if (headerStatus) headerStatus.textContent = `${intAngle}° • Mặt Sáng — Bình Minh Cơ Hội`;
      if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#fbbf24]';
    } else if (storm > 0.78) {
      if (phaseEl) phaseEl.textContent = 'Ban Đêm • Biển Xanh Dạ Quang';
      if (detailEl) detailEl.textContent = 'Dải Ngân Hà • Biển dạ quang • Cửa sổ rực sáng';
      if (headerStatus) headerStatus.textContent = `${intAngle}° • Mặt Tối — Đêm Dạ Quang & Bản Lĩnh`;
      if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#00e5ff]';
    } else {
      const isEnteringNight = intAngle > 0 && intAngle < 180;
      if (phaseEl) phaseEl.textContent = isEnteringNight ? 'Hoàng Hôn • Đêm Đang Xuống' : 'Rạng Đông • Bình Minh Lên';
      if (detailEl) detailEl.textContent = isEnteringNight ? 'Cửa sổ hải đăng bật sáng • Biển ánh dạ quang' : 'Sao mờ dần • Mặt trời ló dạng • Hải âu bay về';
      if (headerStatus) headerStatus.textContent = `${intAngle}° • Vùng Giao Thoa Ngày & Đêm`;
      if (dotEl) dotEl.className = 'w-2.5 h-2.5 rounded-full bg-teal-300 shadow-[0_0_10px_#5eead4]';
    }
  }

  // 8. TƯƠNG TÁC KÉO XOAY 360° & CLICK CHỌN TẦNG KIẾN TRÚC (RAYCASTING)
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  function dismissGestureHint() {
    if (hasDismissedHint) return;
    hasDismissedHint = true;
    const hint = document.getElementById('gesture-hint');
    if (hint) hint.style.opacity = '0';
  }

  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    pointerDownPos.x = e.clientX;
    pointerDownPos.y = e.clientY;
    prevPointerX = e.clientX;
    dragVelocity = 0;
    dismissGestureHint();
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) {
      pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(tierHitMeshes, false);
      container.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
      return;
    }
    const dx = e.clientX - prevPointerX;
    prevPointerX = e.clientX;
    const sensitivity = isMobile ? 0.48 : 0.36;
    dragVelocity = dx * sensitivity;
    targetWorldAngle += dragVelocity;
  });

  window.addEventListener('pointerup', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
    if (moveDist < 6) {
      pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(pointerNDC, camera);
      const hits = raycaster.intersectObjects(tierHitMeshes, false);
      if (hits.length > 0) {
        const tierId = hits[0].object.userData.tierId;
        if (tierId) selectLighthouseTier(tierId);
      }
    }
  });

  container.addEventListener('wheel', (e) => {
    if (activeTierId !== null) return;
    e.preventDefault();
    camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.015, 16, 34);
  }, { passive: false });

  // 9. HIỆU ỨNG CAMERA ZOOM VÀO TẦNG & HIỂN THỊ BẢNG NGHỊ LUẬN
  let showTierPins = true;

  function buildFloatingPinsAndMenu() {
    const pinsLayer = document.getElementById('pins-layer');
    const menuList = document.getElementById('menu-tier-list');
    if (!pinsLayer || !menuList) return;
    pinsLayer.innerHTML = '';
    menuList.innerHTML = '';

    LIGHTHOUSE_TIERS.forEach((tier) => {
      const pinEl = document.createElement('div');
      pinEl.className = 'tier-pin';
      pinEl.id = `tier-pin-${tier.id}`;
      pinEl.innerHTML = `
        <button type="button" class="tier-pin-btn" data-tier-id="${tier.id}">
          <span class="tier-pin-num">${tier.id}</span>
          <span>${tier.shortLabel}</span>
        </button>
      `;
      pinEl.querySelector('button').addEventListener('click', (ev) => {
        ev.stopPropagation();
        selectLighthouseTier(tier.id);
      });
      pinsLayer.appendChild(pinEl);

      const itemBtn = document.createElement('button');
      itemBtn.type = 'button';
      itemBtn.className = 'w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 transition flex items-center justify-between gap-2 text-xs';
      itemBtn.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-5 h-5 rounded-full bg-amber-500/25 text-amber-300 font-bold text-[10px] flex items-center justify-center">${tier.id}</span>
          <span class="font-medium text-amber-50">${tier.shortLabel}</span>
        </div>
        <span class="text-[10px] text-sky-200/70">${tier.targetAngle}°</span>
      `;
      itemBtn.addEventListener('click', () => {
        document.getElementById('menu-drawer')?.classList.add('hidden');
        selectLighthouseTier(tier.id);
      });
      menuList.appendChild(itemBtn);
    });
  }

  buildFloatingPinsAndMenu();

  function selectLighthouseTier(tierId) {
    const tier = LIGHTHOUSE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    activeTierId = tierId;
    audioManager.playChime();
    dismissGestureHint();

    tierHighlightRings.forEach((ring, idx) => {
      const isSelected = (idx + 1) === tierId;
      gsap.to(ring.material, {
        opacity: isSelected ? 0.92 : 0.0,
        duration: 0.45
      });
    });

    document.querySelectorAll('.tier-pin-btn').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.tierId) === tierId);
    });

    const currentMod = ((targetWorldAngle % 360) + 360) % 360;
    let deltaAngle = tier.targetAngle - currentMod;
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;
    targetWorldAngle += deltaAngle;

    const xOffset = window.innerWidth >= 768 ? 2.6 : 0.0;
    gsap.to(camera.position, {
      x: xOffset,
      y: tier.focusY + 1.2,
      z: tier.camDist,
      duration: 1.25,
      ease: 'power3.out'
    });
    gsap.to(cameraLookTarget, {
      x: xOffset * 0.45,
      y: tier.focusY,
      z: 0,
      duration: 1.25,
      ease: 'power3.out'
    });

    renderEssayPanelContent(tier);
    const panel = document.getElementById('essay-panel');
    if (panel) {
      panel.classList.remove('translate-x-[120%]', 'opacity-0', 'pointer-events-none');
      panel.classList.add('translate-x-0', 'opacity-100', 'pointer-events-auto');
    }
  }

  function closeEssayPanel() {
    activeTierId = null;
    tierHighlightRings.forEach((ring) => {
      gsap.to(ring.material, { opacity: 0.0, duration: 0.35 });
    });
    document.querySelectorAll('.tier-pin-btn').forEach((btn) => btn.classList.remove('active'));

    const panel = document.getElementById('essay-panel');
    if (panel) {
      panel.classList.add('translate-x-[120%]', 'opacity-0', 'pointer-events-none');
      panel.classList.remove('translate-x-0', 'opacity-100', 'pointer-events-auto');
    }

    gsap.to(camera.position, {
      x: 0,
      y: 10.5,
      z: 24.5,
      duration: 1.2,
      ease: 'power3.out'
    });
    gsap.to(cameraLookTarget, {
      x: 0,
      y: 8.5,
      z: 0,
      duration: 1.2,
      ease: 'power3.out'
    });
  }

  function renderEssayPanelContent(tier) {
    document.getElementById('essay-tier-badge').textContent = tier.zone;
    document.getElementById('essay-world-tag').textContent = tier.code;
    document.getElementById('essay-title').textContent = tier.title;
    document.getElementById('essay-step-indicator').textContent = `Tầng ${tier.id} / ${LIGHTHOUSE_TIERS.length}`;

    const bodyEl = document.getElementById('essay-body');
    let html = `
      <blockquote class="p-3.5 rounded-2xl bg-amber-500/10 border-l-4 border-amber-600 font-serif-art italic text-base leading-relaxed">
        ${tier.quote}
      </blockquote>
      <p class="text-xs sm:text-sm opacity-90 leading-relaxed font-medium">
        ${tier.summary}
      </p>
    `;

    if (tier.synonyms && tier.synonyms.length) {
      html += `
        <div class="p-3 rounded-xl bg-amber-900/5 border border-amber-700/20">
          <div class="text-[11px] font-bold uppercase tracking-wider text-amber-800 mb-1.5">
            Từ ngữ thay thế cho “Tuổi trẻ” trong bài viết:
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${tier.synonyms.map((s) => `<span class="px-2.5 py-0.5 rounded-full text-xs bg-amber-500/20 font-medium">${s}</span>`).join('')}
          </div>
        </div>
      `;
    }

    html += `<div class="space-y-3">`;
    tier.points.forEach((pt) => {
      html += `
        <div class="p-3.5 rounded-2xl bg-black/[0.035] border border-black/10">
          <h3 class="font-bold text-sm text-amber-800 mb-1">${pt.heading}</h3>
          <p class="text-xs sm:text-sm whitespace-pre-line leading-relaxed">${pt.text}</p>
        </div>
      `;
    });
    html += `</div>`;

    if (tier.proof) {
      html += `
        <div class="p-3.5 rounded-2xl bg-sky-900/10 border border-sky-700/25">
          <div class="text-[11px] font-bold uppercase tracking-wider text-sky-800 mb-1">
            Dẫn chứng & Thông điệp trọng tâm
          </div>
          <p class="text-xs sm:text-sm leading-relaxed">${tier.proof}</p>
        </div>
      `;
    }

    bodyEl.innerHTML = html;
    bodyEl.scrollTop = 0;
  }

  // 10. KẾT NỐI NÚT ĐIỀU KHIỂN GIAO DIỆN & MÀN HÌNH MỞ ĐẦU
  function startCinematicExperience(immediate = false) {
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.classList.add('hidden'), 900);
    }
    audioManager.enableSilentlyIfAllowed();
    gsap.to(camera.position, {
      x: 0,
      y: 10.5,
      z: 24.5,
      duration: immediate ? 0.6 : 2.2,
      ease: 'power3.inOut'
    });
  }

  window.addEventListener('load', () => {
    const q = document.getElementById('intro-quote');
    const s = document.getElementById('intro-sub');
    if (q) q.classList.remove('opacity-0', 'translate-y-3');
    if (s) s.classList.remove('opacity-0');
    gsap.to(camera.position, {
      z: 28.5,
      y: 11.2,
      duration: 3.4,
      ease: 'power2.out'
    });
  });

  document.getElementById('btn-enter-world')?.addEventListener('click', () => startCinematicExperience(false));
  document.getElementById('btn-skip-intro')?.addEventListener('click', () => startCinematicExperience(true));

  document.getElementById('btn-audio')?.addEventListener('click', () => {
    const isOn = audioManager.toggle();
    window.updateAudioUI(isOn);
  });

  document.getElementById('btn-reset-angle')?.addEventListener('click', () => {
    closeEssayPanel();
    const mod = ((targetWorldAngle % 360) + 360) % 360;
    const diff = mod > 180 ? 360 - mod : -mod;
    targetWorldAngle += diff;
  });

  document.getElementById('btn-menu-reset')?.addEventListener('click', () => {
    document.getElementById('menu-drawer')?.classList.add('hidden');
    closeEssayPanel();
    targetWorldAngle = 0;
  });

  document.getElementById('btn-toggle-tiers')?.addEventListener('click', () => {
    showTierPins = !showTierPins;
    const pinsLayer = document.getElementById('pins-layer');
    const badge = document.getElementById('pins-badge');
    if (pinsLayer) pinsLayer.style.opacity = showTierPins ? '1' : '0';
    if (badge) badge.textContent = showTierPins ? 'Hiện' : 'Ẩn';
  });

  document.getElementById('btn-menu')?.addEventListener('click', () => {
    document.getElementById('menu-drawer')?.classList.toggle('hidden');
  });
  document.getElementById('btn-close-menu')?.addEventListener('click', () => {
    document.getElementById('menu-drawer')?.classList.add('hidden');
  });

  document.getElementById('btn-close-essay')?.addEventListener('click', closeEssayPanel);
  document.getElementById('btn-prev-tier')?.addEventListener('click', () => {
    const cur = activeTierId || 1;
    const prev = cur <= 1 ? LIGHTHOUSE_TIERS.length : cur - 1;
    selectLighthouseTier(prev);
  });
  document.getElementById('btn-next-tier')?.addEventListener('click', () => {
    const cur = activeTierId || 1;
    const next = cur >= LIGHTHOUSE_TIERS.length ? 1 : cur + 1;
    selectLighthouseTier(next);
  });

  document.getElementById('angle-slider')?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    targetWorldAngle = val;
    currentWorldAngle = val;
    dismissGestureHint();
  });

  document.querySelectorAll('.angle-jump-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const jumpTo = Number(btn.dataset.jumpAngle);
      const mod = ((targetWorldAngle % 360) + 360) % 360;
      let diff = jumpTo - mod;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      targetWorldAngle += diff;
      dismissGestureHint();
    });
  });

  document.getElementById('btn-reading-theme')?.addEventListener('click', (e) => {
    document.body.classList.toggle('dark-academic');
    const isDark = document.body.classList.contains('dark-academic');
    e.currentTarget.textContent = isDark ? 'Đêm Hải Đăng (Tối)' : 'Kem ấm (Dễ đọc)';
  });

  function applyQualityPreset(preset) {
    currentQuality = preset;
    document.querySelectorAll('.quality-btn').forEach((b) => {
      const active = b.dataset.quality === preset;
      b.className = active
        ? 'quality-btn px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-semibold text-[10px] transition'
        : 'quality-btn px-2.5 py-1 rounded-full text-sky-100/80 hover:text-white text-[10px] transition';
    });
    if (preset === 'high') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.0));
      renderer.shadowMap.enabled = true;
    } else if (preset === 'balanced') {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
      renderer.shadowMap.enabled = true;
    } else {
      renderer.setPixelRatio(1.0);
      renderer.shadowMap.enabled = false;
    }
  }

  document.querySelectorAll('.quality-btn').forEach((btn) => {
    btn.addEventListener('click', () => applyQualityPreset(btn.dataset.quality));
  });

  // 11. VÒNG LẶP ANIMATION THỜI GIAN THỰC
  const clock = new THREE.Clock();
  const projVec = new THREE.Vector3();
  let lightningTimer = 2.8;
  let lightningDecay = 0.0;
  let isTabHidden = false;

  document.addEventListener('visibilitychange', () => {
    isTabHidden = document.hidden;
  });

  function animate() {
    requestAnimationFrame(animate);
    if (isTabHidden) return;

    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsedTime = clock.getElapsedTime();

    // 1. Rotational Inertia
    if (!isDragging) {
      targetWorldAngle += dragVelocity;
      dragVelocity *= 0.92;
      if (Math.abs(dragVelocity) < 0.005) dragVelocity = 0;
    }
    currentWorldAngle += (targetWorldAngle - currentWorldAngle) * 0.12;
    updateEnvironmentByAngle(currentWorldAngle, elapsedTime);

    // 2. Rotate Lighthouse Fresnel Lamp & Volumetric Beams
    if (lanternHeadGroup) {
      lanternHeadGroup.rotation.y = elapsedTime * (0.65 + currentStormFactor * 0.55);
    }

    // 3. Dynamic Ocean Vertex Waves, Golden Sun Path (Day) & Bioluminescent Glow (Night)
    const posAttr = oceanGeo.attributes.position;
    const colAttr = oceanGeo.attributes.color;
    tempColor.copy(colOceanDeepDay).lerp(colOceanDeepNight, currentStormFactor);
    tempShallow.copy(colOceanShallowDay).lerp(colOceanShallowNight, currentStormFactor);

    const step = currentQuality === 'performance' ? 2 : 1;
    const dayFactor = Math.max(0.0, 1.0 - currentStormFactor * 1.25);

    for (let i = 0; i < vCount; i += step) {
      const bx = oceanBaseX[i];
      const bz = oceanBaseZ[i];
      const h = getWaveHeight(bx, bz, elapsedTime, currentStormFactor);
      posAttr.setY(i, h);

      const distFromIsland = Math.sqrt(bx * bx + bz * bz);
      const coastalMix = Math.max(0, 1.0 - Math.max(0, distFromIsland - 6.5) / 15.0);
      const crestFoam = smoothstep(0.3 - currentStormFactor * 0.12, 0.95, h);

      let r = THREE.MathUtils.lerp(tempColor.r, tempShallow.r, coastalMix);
      let g = THREE.MathUtils.lerp(tempColor.g, tempShallow.g, coastalMix);
      let b = THREE.MathUtils.lerp(tempColor.b, tempShallow.b, coastalMix);

      // Daytime white foam & golden sun glitter path along the water
      if (dayFactor > 0.01) {
        const foamDayAmt = crestFoam * 0.72 * dayFactor;
        r = THREE.MathUtils.lerp(r, colFoam.r, foamDayAmt);
        g = THREE.MathUtils.lerp(g, colFoam.g, foamDayAmt);
        b = THREE.MathUtils.lerp(b, colFoam.b, foamDayAmt);

        // Shimmering sun reflection path toward sun direction (+X, -Z)
        if (bz < -4.0) {
          const sunLineDist = Math.abs(bx + bz * 0.48);
          const sunPathMask = Math.exp(-sunLineDist * 0.08) * smoothstep(0.05, 0.55, h);
          r = THREE.MathUtils.lerp(r, colSunSpec.r, sunPathMask * 0.55 * dayFactor);
          g = THREE.MathUtils.lerp(g, colSunSpec.g, sunPathMask * 0.55 * dayFactor);
          b = THREE.MathUtils.lerp(b, colSunSpec.b, sunPathMask * 0.55 * dayFactor);
        }
      }

      // Nighttime Bioluminescent Electric Cyan Glow on waves & shore
      if (currentStormFactor > 0.08) {
        const biolum = getBioluminescentGlow(bx, bz, h, distFromIsland, elapsedTime, currentStormFactor);
        r = THREE.MathUtils.lerp(r, colBiolumCyan.r, biolum * 0.85);
        g = THREE.MathUtils.lerp(g, colBiolumCyan.g, biolum * 0.92);
        b = THREE.MathUtils.lerp(b, colBiolumCyan.b, biolum * 0.98);
      }

      colAttr.setXYZ(i, r, g, b);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    if (currentQuality !== 'performance') {
      oceanGeo.computeVertexNormals();
    }

    // 4. Shoreline Foam Rings Pulse (Shifts from White Foam to Glowing Cyan Bioluminescence at Night)
    foamRings.forEach((f) => {
      const pulse = 0.5 + 0.5 * Math.sin(elapsedTime * (1.8 + currentStormFactor * 1.4) + f.phase);
      const scale = f.baseR + pulse * (0.06 + currentStormFactor * 0.09);
      f.mesh.scale.set(scale, scale, 1);
      f.mesh.position.y = getWaveHeight(7.5, 0, elapsedTime, currentStormFactor) * 0.35 + 0.15;
      f.mat.color.copy(colFoamDay).lerp(colFoamNightBiolum, currentStormFactor);
      f.mat.opacity = f.baseOp * (0.75 + 0.45 * pulse) * (1.0 + currentStormFactor * 0.55);
    });

    // 5. Update Bioluminescent Plankton Particles on Wave Surface at Night
    if (biolumPlankton.points.visible) {
      const pPos = biolumPlankton.geo.attributes.position;
      const coords = biolumPlankton.baseCoords;
      const pStep = currentQuality === 'balanced' ? 2 : 1;
      for (let i = 0; i < biolumPlankton.count; i += pStep) {
        const px = coords[i * 3] + Math.sin(elapsedTime * 0.6 + coords[i * 3 + 2]) * 0.45;
        const pz = coords[i * 3 + 1] + Math.cos(elapsedTime * 0.5 + coords[i * 3 + 2]) * 0.45;
        const py = getWaveHeight(px, pz, elapsedTime, currentStormFactor) + 0.14;
        pPos.setXYZ(i, px, py, pz);
      }
      pPos.needsUpdate = true;
    }

    // 6. White Sailboat Buoyancy
    const boatLocalX = 11.8 + Math.sin(elapsedTime * 0.35) * 0.65;
    const boatLocalZ = 6.2 + Math.cos(elapsedTime * 0.28) * 0.65;
    sailboatGroup.position.x = boatLocalX;
    sailboatGroup.position.z = boatLocalZ;

    const boatWorld = new THREE.Vector3(boatLocalX, 0, boatLocalZ).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      worldGroup.rotation.y
    );
    const hCenter = getWaveHeight(boatWorld.x, boatWorld.z, elapsedTime, currentStormFactor);
    const hBow = getWaveHeight(boatWorld.x + 1.2, boatWorld.z, elapsedTime, currentStormFactor);
    const hPort = getWaveHeight(boatWorld.x, boatWorld.z + 0.7, elapsedTime, currentStormFactor);

    sailboatGroup.position.y = hCenter + 0.08;
    const targetPitch = (hBow - hCenter) * (0.45 + currentStormFactor * 0.35);
    const targetRoll = (hPort - hCenter) * (0.55 + currentStormFactor * 0.45);
    sailboatGroup.rotation.z = THREE.MathUtils.lerp(sailboatGroup.rotation.z, targetPitch, 0.15);
    sailboatGroup.rotation.x = THREE.MathUtils.lerp(sailboatGroup.rotation.x, targetRoll, 0.15);

    if (mainSailMesh) {
      const sPos = mainSailMesh.geometry.attributes.position;
      sPos.setZ(2, 0.26 + Math.sin(elapsedTime * (2.5 + currentStormFactor * 4.0)) * (0.08 + currentStormFactor * 0.14));
      sPos.needsUpdate = true;
    }

    // 7. Detailed 3D Seagulls Articulated Wing Flapping & Soaring Orbit
    if (seagullsGroup.visible) {
      seagulls.forEach((g, idx) => {
        const a = elapsedTime * g.speed + g.phase;
        const climbOut = currentStormFactor * 16.0;
        const r = g.radius + climbOut;
        const gx = Math.cos(a) * r;
        const gz = Math.sin(a) * r;
        const gy = g.baseHeight + Math.sin(elapsedTime * 1.5 + idx) * 0.85 + climbOut * 0.6;
        g.group.position.set(gx, gy, gz);

        // Tangent heading along circular orbit + gentle banking roll
        g.group.rotation.y = -a;
        g.group.rotation.z = -0.18 + Math.sin(elapsedTime * 1.5 + idx) * 0.08;

        // Articulated 2-segment wingbeat (Shoulder + delayed Elbow flex)
        const wingCycle = elapsedTime * 6.8 + idx * 1.4;
        const shoulderFlap = Math.sin(wingCycle) * 0.46;
        const elbowFlap = Math.sin(wingCycle - 0.65) * 0.38 - 0.08;

        g.leftShoulder.rotation.z = shoulderFlap;
        g.leftElbow.rotation.z = elbowFlap;
        g.rightShoulder.rotation.z = -shoulderFlap;
        g.rightElbow.rotation.z = -elbowFlap;
      });
    }

    // 8. Clouds Drift
    cloudClusters.forEach((c) => {
      c.angle += dt * c.speed * (1.0 + currentStormFactor * 2.5);
      c.group.position.x = Math.cos(c.angle) * c.dist;
      c.group.position.z = Math.sin(c.angle) * c.dist;
    });

    // 9. Wind-driven Rain & Distant Lightning
    if (rainLines.visible) {
      const rArr = rainGeo.attributes.position.array;
      const fallSpeed = 28 + currentStormFactor * 20;
      const windSpeed = 8 + currentStormFactor * 9;
      for (let i = 0; i < rainCount; i++) {
        const idx = i * 6;
        rArr[idx] -= windSpeed * dt;
        rArr[idx + 1] -= fallSpeed * dt;
        rArr[idx + 3] = rArr[idx] - 0.55;
        rArr[idx + 4] = rArr[idx + 1] - 1.65;
        if (rArr[idx + 1] < 0) {
          rArr[idx] = (Math.random() - 0.5) * 70;
          rArr[idx + 1] = 34 + Math.random() * 6;
          rArr[idx + 2] = (Math.random() - 0.5) * 70;
          rArr[idx + 3] = rArr[idx] - 0.55;
          rArr[idx + 4] = rArr[idx + 1] - 1.65;
          rArr[idx + 5] = rArr[idx + 2] - 0.2;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    if (currentStormFactor > 0.62) {
      lightningTimer -= dt;
      if (lightningTimer <= 0) {
        lightningTimer = 3.2 + Math.random() * 4.5;
        lightningDecay = 1.0;
        lightningBolt.position.x = (Math.random() - 0.5) * 45;
        audioManager.playThunder();
      }
    }
    if (lightningDecay > 0.01) {
      lightningDecay *= 0.86;
      skyUniforms.uLightning.value = lightningDecay * currentStormFactor;
      lightningFlashLight.intensity = lightningDecay * 6.0 * currentStormFactor;
      boltMat.opacity = lightningDecay * currentStormFactor;
    } else {
      skyUniforms.uLightning.value = 0;
      lightningFlashLight.intensity = 0;
      boltMat.opacity = 0;
    }

    // 10. Audio & 3D Floating Tier Pins Projection
    audioManager.updateWeather(currentStormFactor, elapsedTime);
    camera.lookAt(cameraLookTarget);

    if (showTierPins) {
      const halfW = window.innerWidth * 0.5;
      const halfH = window.innerHeight * 0.5;
      tierAnchors3D.forEach((item) => {
        const pinEl = document.getElementById(`tier-pin-${item.id}`);
        if (!pinEl) return;
        item.obj.getWorldPosition(projVec);
        projVec.project(camera);
        if (projVec.z > 1.0) {
          pinEl.style.opacity = '0';
          return;
        }
        const sx = projVec.x * halfW + halfW;
        const sy = -projVec.y * halfH + halfH;
        pinEl.style.opacity = '1';
        pinEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%)`;
      });
    }

    renderer.render(scene, camera);
  }

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  animate();
})();
