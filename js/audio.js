// ============================================================================
// js/audio.js
// Hệ thống âm thanh tổng hợp đại dương ban ngày & sóng đêm / giông bão (Web Audio API)
// ============================================================================

class OceanStormAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.masterGain = null;
    this.calmGain = null;
    this.stormGain = null;
    this.windFilter = null;
    this.stormFactor = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.001;
    this.masterGain.connect(this.ctx.destination);

    // Pink/brown noise buffer for ocean surf, night breeze & rain
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.2;
    }

    // Calm Ocean Surf Layer
    const calmSource = this.ctx.createBufferSource();
    calmSource.buffer = noiseBuffer;
    calmSource.loop = true;
    const calmFilter = this.ctx.createBiquadFilter();
    calmFilter.type = 'lowpass';
    calmFilter.frequency.value = 340;
    this.calmGain = this.ctx.createGain();
    this.calmGain.gain.value = 0.22;
    calmSource.connect(calmFilter);
    calmFilter.connect(this.calmGain);
    this.calmGain.connect(this.masterGain);
    calmSource.start(0);

    // Night Wind & Storm Surf Layer
    const stormSource = this.ctx.createBufferSource();
    stormSource.buffer = noiseBuffer;
    stormSource.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 520;
    this.windFilter.Q.value = 1.4;
    this.stormGain = this.ctx.createGain();
    this.stormGain.gain.value = 0.01;
    stormSource.connect(this.windFilter);
    this.windFilter.connect(this.stormGain);
    this.stormGain.connect(this.masterGain);
    stormSource.start(0);
  }

  toggle() {
    if (!this.ctx) this.init();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.enabled = !this.enabled;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.enabled ? 0.55 : 0.0001, now, 0.35);
    return this.enabled;
  }

  enableSilentlyIfAllowed() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.enabled) {
      this.enabled = true;
      this.masterGain.gain.setTargetAtTime(0.45, this.ctx.currentTime, 0.6);
      window.updateAudioUI(true);
    }
  }

  updateWeather(stormFactor, time) {
    this.stormFactor = stormFactor;
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const waveLfo = 0.5 + 0.5 * Math.sin(time * 0.85);
    const calmVol = (0.14 + 0.14 * waveLfo) * (1.0 - stormFactor * 0.45);
    const stormVol = Math.pow(stormFactor, 1.35) * 0.46;
    this.calmGain.gain.setTargetAtTime(calmVol, now, 0.15);
    this.stormGain.gain.setTargetAtTime(stormVol, now, 0.15);
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(380 + stormFactor * 600 + Math.sin(time * 1.7) * 90, now, 0.15);
    }
  }

  playThunder() {
    if (!this.ctx || !this.enabled || this.stormFactor < 0.45) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 1.8);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 140;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.32 * this.stormFactor, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 2.2);
  }

  playChime() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.45);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

window.audioManager = new OceanStormAudio();

window.updateAudioUI = function updateAudioUI(isOn) {
  const iconOff = document.getElementById('icon-audio-off');
  const iconOn = document.getElementById('icon-audio-on');
  if (iconOff && iconOn) {
    iconOff.classList.toggle('hidden', isOn);
    iconOn.classList.toggle('hidden', !isOn);
  }
};
