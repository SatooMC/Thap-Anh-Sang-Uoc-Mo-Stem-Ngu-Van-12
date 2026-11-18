// ============================================================================
// js/shaders.js
// GLSL Shaders & Hàm tính toán sóng biển / dạ quang sinh học (Bioluminescence)
// - Ban ngày (0°): Bầu trời xanh trong, mặt trời rực rỡ tỏa quầng sáng ấm
// - Ban đêm (180°): Bầu trời đêm sâu thẳm, Dải Ngân Hà (Milky Way) vắt chéo,
//   hàng ngàn vì sao lấp lánh, và mặt biển phát ánh sáng xanh dạ quang mờ ảo.
// ============================================================================

window.SKY_VERTEX_SHADER = `
  varying vec3 vWorldPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

window.SKY_FRAGMENT_SHADER = `
  uniform float uStorm;
  uniform float uTime;
  uniform float uLightning;
  uniform vec3 uSunZenith;
  uniform vec3 uSunHorizon;
  uniform vec3 uStormZenith;
  uniform vec3 uStormHorizon;
  varying vec3 vWorldPos;

  // Hash & 3D Value Noise for Milky Way Nebula & Starfield
  float hash31(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash31(i + vec3(1.0, 1.0, 1.0));
    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise3D(p);
      p = p * 2.05 + vec3(13.1, 7.7, 5.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldPos);
    float h = clamp(dir.y * 0.85 + 0.15, 0.0, 1.0);

    // 1. Base Sky Gradient: Radiant Azure Day vs Deep Starry Night
    vec3 dayMid = vec3(0.32, 0.66, 0.90);
    vec3 dayCol = mix(uSunHorizon, dayMid, smoothstep(0.0, 0.42, h));
    dayCol = mix(dayCol, uSunZenith, smoothstep(0.35, 1.0, h));

    vec3 nightMid = vec3(0.04, 0.11, 0.22);
    vec3 nightCol = mix(uStormHorizon, nightMid, smoothstep(0.0, 0.45, h));
    nightCol = mix(nightCol, uStormZenith, smoothstep(0.4, 1.0, h));

    vec3 col = mix(dayCol, nightCol, uStorm);

    // 2. Radiant Daytime Sun Disc, Golden Corona & Atmospheric God-Rays
    vec3 sunDir = normalize(vec3(0.42, 0.34, -0.84));
    float sunAmt = max(dot(dir, sunDir), 0.0);
    float dayVis = clamp(1.0 - uStorm * 1.15, 0.0, 1.0);

    // Wide atmospheric scattering glow
    col += vec3(1.0, 0.82, 0.48) * pow(sunAmt, 5.0) * 0.42 * dayVis;
    // Intense golden inner corona
    col += vec3(1.0, 0.93, 0.72) * pow(sunAmt, 28.0) * 0.65 * dayVis;
    // Crisp blazing solar core disc
    col += vec3(1.0, 0.99, 0.92) * smoothstep(0.994, 0.9992, sunAmt) * 1.35 * dayVis;

    // Horizon warm golden rim during day/transition
    float horizonGlow = pow(1.0 - clamp(abs(dir.y), 0.0, 1.0), 4.0);
    col += vec3(0.98, 0.88, 0.68) * horizonGlow * 0.18 * dayVis;

    // 3. Night Sky Milky Way Galaxy Band & Twinkling Stars (Active as uStorm -> 1.0)
    float nightVis = smoothstep(0.22, 0.88, uStorm) * smoothstep(0.02, 0.22, dir.y);
    if (nightVis > 0.001) {
      // Diagonal galaxy plane normal across the sky dome
      vec3 mwAxis = normalize(vec3(0.68, 0.42, 0.60));
      float bandDist = abs(dot(dir, mwAxis));
      float mwProfile = exp(-bandDist * bandDist * 14.0);

      float n1 = fbm(dir * 6.5);
      float n2 = fbm(dir * 14.0 + vec3(2.4, -1.8, 4.1));
      float dustRift = smoothstep(0.38, 0.68, n2);

      vec3 mwCoreCol = vec3(0.35, 0.68, 0.96);
      vec3 mwOuterCol = vec3(0.16, 0.36, 0.68);
      vec3 nebula = mix(mwOuterCol, mwCoreCol, n1) * mwProfile * (0.45 + 0.75 * n1);
      // Dark cosmic dust lane running down the center of the Milky Way
      nebula *= mix(0.35, 1.15, dustRift);
      // Warm galactic core glow near low-mid altitude
      nebula += vec3(0.75, 0.68, 0.88) * mwProfile * pow(n1, 2.2) * 0.32;

      col += nebula * nightVis * 0.95;

      // Procedural high-density crisp background stars
      vec3 starCell = floor(dir * 260.0);
      float starRand = hash31(starCell);
      if (starRand > 0.9915) {
        vec3 starCenter = normalize(starCell + 0.5);
        float dStar = length(dir - starCenter) * 260.0;
        float twinkle = 0.55 + 0.45 * sin(uTime * (2.5 + fract(starRand * 91.7) * 5.0) + starRand * 100.0);
        float starBright = smoothstep(0.48, 0.05, dStar) * twinkle;
        vec3 starTint = mix(vec3(0.72, 0.88, 1.0), vec3(1.0, 0.94, 0.82), fract(starRand * 37.3));
        col += starTint * starBright * nightVis * (1.2 + mwProfile * 0.8);
      }

      // Subtle bioluminescent cyan horizon reflection in night sky
      col += vec3(0.0, 0.45, 0.68) * horizonGlow * 0.22 * nightVis;
    }

    // 4. Distant Horizon Lightning Flash in Storm World
    col += vec3(0.74, 0.86, 1.0) * uLightning * (1.0 - h * 0.68);

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Shared deterministic wave height function for Ocean Mesh, Sailboat & Bioluminescent Plankton
window.getWaveHeight = function getWaveHeight(x, z, time, storm) {
  const amp = 0.22 + storm * 1.15;
  const speed = 1.15 + storm * 1.4;
  const t = time * speed;
  const w1 = Math.sin(x * 0.14 + t * 1.1) * Math.cos(z * 0.12 + t * 0.85) * amp;
  const w2 = Math.sin((x * 0.22 - z * 0.19) + t * 1.45) * (amp * 0.48);
  const w3 = Math.cos(x * 0.35 + z * 0.28 - t * 1.9) * (amp * 0.24 * (0.4 + storm));
  return w1 + w2 + w3;
};

// Bioluminescent filament intensity calculator for wave vertices at night
window.getBioluminescentGlow = function getBioluminescentGlow(x, z, waveH, distFromIsland, time, nightFactor) {
  if (nightFactor < 0.05) return 0.0;
  // Swirling organic plankton veins along waves
  const swirl1 = Math.sin(x * 0.38 + z * 0.29 + time * 1.35) * Math.cos(z * 0.42 - x * 0.21 - time * 0.95);
  const swirl2 = Math.sin(distFromIsland * 1.45 - time * 2.4);
  const veinMask = Math.max(0.0, swirl1 * 0.65 + swirl2 * 0.35);

  // Glow concentrates on wave crests and in surging rings around the rocky island/shore
  const crestFactor = Math.max(0.0, Math.min(1.0, (waveH + 0.15) / 1.15));
  const shoreRing = Math.exp(-Math.pow((distFromIsland - 9.2) / 5.5, 2.0));
  const outerSurf = Math.exp(-Math.pow((distFromIsland - 18.5) / 8.0, 2.0)) * 0.65;

  const rawGlow = ( Math.pow(crestFactor, 1.4) * (0.45 + 0.55 * veinMask) + shoreRing * (0.55 + 0.45 * swirl2) + outerSurf * veinMask );
  return Math.min(1.0, rawGlow * nightFactor * 1.25);
};
