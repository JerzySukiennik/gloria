// Gloria audio: the song, the priest and the congregation through a small-church impulse response, with a lookahead event clock.
const SAMPLES = ['organq60', 'organq63', 'bell', 'sanctus', 'cheer', 'applause', 'chatter', 'room'];
const VOICES = ['p_intro', 'p_panzwami', 'p_hype', 'p_gloria', 'p_cisza', 'p_wstancie', 'p_idzcie', 'p_koniec', 'p_alleluja', 'p_glosniej', 'p_pieknie', 'p_brawo', 'p_jeszcze', 'c_amen1', 'c_izduchem', 'c_amen3', 'c_bogu'];
const BASE = { organq60: 60, organq63: 63, sanctus: 80.6 };

export class AudioEngine {
  constructor() {
    this.raw = new Map();
    this.buf = new Map();
    this.events = [];
    this.loops = new Map();
    this.ctx = null;
    this.muted = false;
  }

  async prefetch(onProgress) {
    const list = [['ameno', 'assets/audio/ameno.mp3'], ...SAMPLES.map((n) => [n, `assets/audio/${n}.mp3`]), ['ir', 'assets/audio/ir.wav'], ...VOICES.map((n) => [n, `assets/voice/${n}.mp3`])];
    const sizes = { ameno: 12 };
    const total = list.reduce((a, [n]) => a + (sizes[n] || 1), 0);
    let done = 0;
    await Promise.all(list.map(async ([n, url]) => {
      const r = await fetch(url);
      this.raw.set(n, await r.arrayBuffer());
      done += sizes[n] || 1;
      onProgress && onProgress(done / total);
    }));
  }

  async start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
    const ctx = new AC({ latencyHint: 'playback' });
    this.ctx = ctx;
    if (ctx.state !== 'running') await ctx.resume().catch(() => {});
    const unlock = ctx.createBufferSource();
    unlock.buffer = ctx.createBuffer(1, 1, 22050);
    unlock.connect(ctx.destination);
    unlock.start();
    this.master = ctx.createGain();
    this.master.gain.value = this.level = 0.8;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18; glue.ratio.value = 2; glue.knee.value = 10; glue.attack.value = 0.01; glue.release.value = 0.25;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.ratio.value = 20; lim.knee.value = 0; lim.attack.value = 0.002; lim.release.value = 0.12;
    this.master.connect(glue).connect(lim).connect(ctx.destination);
    this.reverb = ctx.createConvolver();
    const rv = ctx.createGain();
    rv.gain.value = 0.9;
    this.reverb.connect(rv).connect(this.master);
    const bus = (gain, send) => {
      const g = ctx.createGain();
      g.gain.value = gain;
      g.connect(this.master);
      const s = ctx.createGain();
      s.gain.value = send;
      g.connect(s).connect(this.reverb);
      return g;
    };
    this.song = bus(0.95, 0.05);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.55;
    this.song.connect(this.analyser);
    this.bands = new Uint8Array(this.analyser.frequencyBinCount);
    this.bed = bus(0.7, 0.3);
    this.voice = bus(1.0, 0.36);
    this.voiceAn = ctx.createAnalyser();
    this.voiceAn.fftSize = 256;
    this.voice.connect(this.voiceAn);
    this.vbuf = new Uint8Array(this.voiceAn.fftSize);
    this.shout = bus(0.75, 0.7);
    this.shout.connect(this.voiceAn);
    this.crowd = bus(0.8, 0.45);
    this.sfx = bus(0.8, 0.35);
    this.amb = bus(0.6, 0.15);
    await Promise.all([...this.raw.entries()].map(async ([n, ab]) => {
      this.buf.set(n, await ctx.decodeAudioData(ab.slice(0)));
    }));
    this.raw.clear();
    this.reverb.buffer = this.buf.get('ir');
    this.timer = setInterval(() => this.pump(), 25);
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }
  get latency() { return this.ctx ? (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0) : 0; }

  at(t, fn) {
    this.events.push({ t, fn });
    this.events.sort((a, b) => a.t - b.t);
  }

  clear() { this.events = []; }

  pump() {
    if (!this.ctx) return;
    const horizon = this.ctx.currentTime + 0.12;
    while (this.events.length && this.events[0].t <= horizon) {
      const e = this.events.shift();
      try { e.fn(Math.max(e.t, this.ctx.currentTime)); } catch (err) { console.error(err); }
    }
  }

  play(name, t, o = {}) {
    const b = this.buf.get(name);
    if (!b || !this.ctx) return null;
    const ctx = this.ctx;
    t = Math.max(t ?? ctx.currentTime, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = o.rate ?? 1;
    if (o.loop) src.loop = true;
    const g = ctx.createGain();
    const gain = o.gain ?? 1;
    const att = o.attack ?? 0.004;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + att);
    let node = g;
    if (o.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = o.pan;
      g.connect(p);
      node = p;
    }
    node.connect(o.bus || this.sfx);
    src.connect(g);
    src.start(t, o.offset || 0);
    if (o.dur != null) {
      const rel = o.release ?? 0.08;
      g.gain.setValueAtTime(gain, t + Math.max(att, o.dur));
      g.gain.linearRampToValueAtTime(0, t + Math.max(att, o.dur) + rel);
      src.stop(t + Math.max(att, o.dur) + rel + 0.02);
    }
    return { src, g };
  }

  note(name, midi, t, o = {}) {
    return this.play(name, t, { ...o, rate: Math.pow(2, (midi - BASE[name]) / 12) });
  }

  playSong(t, offset = 0) {
    this.stopSong();
    this.songH = this.play('ameno', t, { bus: this.song, gain: 1, attack: 0.02, offset });
    this.songStart = t - offset;
    return this.buf.get('ameno').duration;
  }

  stopSong(fade = 0.05) {
    if (!this.songH) return;
    const { src, g } = this.songH;
    g.gain.cancelScheduledValues(this.now);
    g.gain.setValueAtTime(g.gain.value, this.now);
    g.gain.linearRampToValueAtTime(0, this.now + fade);
    try { src.stop(this.now + fade + 0.02); } catch (e) {}
    this.songH = null;
  }

  duck(t, dur, depth = 0.45) {
    const g = this.song.gain;
    g.setTargetAtTime(0.95 * depth, t, 0.08);
    g.setTargetAtTime(0.95, t + dur, 0.35);
  }

  loop(name, bus, gain, fade = 2) {
    if (this.loops.has(name)) { this.loopGain(name, gain, fade); return; }
    const h = this.play(name, this.now, { loop: true, bus, gain: 0.0001, attack: 0.01 });
    if (!h) return;
    h.g.gain.cancelScheduledValues(this.now);
    h.g.gain.setValueAtTime(0.0001, this.now);
    h.g.gain.linearRampToValueAtTime(gain, this.now + fade);
    this.loops.set(name, h);
  }

  loopGain(name, gain, fade = 2) {
    const h = this.loops.get(name);
    if (!h) return;
    const g = h.g.gain;
    g.cancelScheduledValues(this.now);
    g.setValueAtTime(g.value, this.now);
    g.linearRampToValueAtTime(Math.max(0.0001, gain), this.now + fade);
  }

  voiceLine(name, t, o = {}) {
    const b = this.buf.get(name);
    const crowd = name.startsWith('c_');
    this.play(name, t, { bus: o.shout ? this.shout : crowd ? this.crowd : this.voice, gain: o.gain ?? (crowd ? 1.0 : 1.15) });
    const d = b ? b.duration : 0;
    if (o.duck) this.duck(t, d, o.duck);
    return d;
  }

  dur(name) { const b = this.buf.get(name); return b ? b.duration : 0; }

  levels(out) {
    if (!this.analyser) return out;
    this.analyser.getByteFrequencyData(this.bands);
    const edges = [1, 3, 6, 10, 16, 26, 42, 70, 120];
    for (let i = 0; i < 8; i++) {
      let s = 0;
      for (let k = edges[i]; k < edges[i + 1]; k++) s += this.bands[k];
      out[i] = Math.min(1, (s / (edges[i + 1] - edges[i]) / 255) * 1.3);
    }
    return out;
  }

  voiceLevel() {
    if (!this.voiceAn) return 0;
    this.voiceAn.getByteTimeDomainData(this.vbuf);
    let s = 0;
    for (let i = 0; i < this.vbuf.length; i++) { const v = (this.vbuf[i] - 128) / 128; s += v * v; }
    return Math.min(1, Math.sqrt(s / this.vbuf.length) * 5);
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.level, this.ctx.currentTime, 0.05);
  }
}
