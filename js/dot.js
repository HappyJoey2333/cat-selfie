/**
 * 红点动画控制器
 * 负责红点定位、移动动画和参数调节
 */
class DotController {
  constructor(dotElement) {
    this.dot = dotElement;
    this.enabled = true;
    this.animating = false;
    this.animFrameId = null;

    // 移动参数
    this.speed = 5;           // 移动速度（px/帧）
    this.changeFreq = 400;    // 改变方向的频率（ms）
    this.padding = 40;        // 距离屏幕边缘的安全距离

    // 红点当前位置
    this.x = 0;
    this.y = 0;
    // 当前移动方向
    this.dx = 0;
    this.dy = 0;
    this.lastChange = 0;

    // 鸟叫声控制器
    this.birdSound = new BirdSound();
  }

  /** 获取屏幕移动范围 */
  _getBounds() {
    return {
      minX: this.padding,
      maxX: window.innerWidth - this.padding,
      minY: this.padding,
      maxY: window.innerHeight - this.padding,
    };
  }

  /** 初始化红点位置并开始动画 */
  start() {
    if (this.animating) return;

    // 初始位置：屏幕中心
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight / 2;
    this._updatePosition();

    this.animating = true;
    this.lastChange = performance.now();
    this._randomizeDirection();
    this._animate();

    // 开始播放鸟叫声
    this.birdSound.start();
  }

  /** 停止动画 */
  stop() {
    this.animating = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.birdSound.stop();
  }

  /** 切换红点显示/隐藏 */
  toggle() {
    this.enabled = !this.enabled;
    this.dot.classList.toggle('hidden-dot', !this.enabled);
    if (this.enabled && !this.animating) {
      this.start();
    } else if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  /** 窗口大小变化时更新 */
  updateLensPosition() {
    const bounds = this._getBounds();
    this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x));
    this.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.y));
  }

  /** 动态设置移动速度 */
  setSpeed(val) {
    this.speed = val;
  }

  /** 动画循环 */
  _animate() {
    if (!this.animating) return;

    const now = performance.now();
    const bounds = this._getBounds();

    // 定期改变方向
    if (now - this.lastChange > this.changeFreq) {
      this._randomizeDirection();
      this.lastChange = now;
    }

    // 移动红点
    this.x += this.dx * this.speed;
    this.y += this.dy * this.speed;

    // 碰到边界则反弹
    if (this.x < bounds.minX || this.x > bounds.maxX) {
      this.dx = -this.dx;
      this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x));
      // 反弹时加一点随机偏移，模拟不可预测的移动
      this.dy += (Math.random() - 0.5) * 0.6;
      const len = Math.sqrt(this.dx ** 2 + this.dy ** 2) || 1;
      this.dx /= len;
      this.dy /= len;
    }
    if (this.y < bounds.minY || this.y > bounds.maxY) {
      this.dy = -this.dy;
      this.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.y));
      this.dx += (Math.random() - 0.5) * 0.6;
      const len = Math.sqrt(this.dx ** 2 + this.dy ** 2) || 1;
      this.dx /= len;
      this.dy /= len;
    }

    // 偶尔产生突然的方向变化（模拟激光笔的跳跃感）
    if (Math.random() < 0.008) {
      this._randomizeDirection();
      // 跳跃式移动到新位置
      const jumpDist = 60 + Math.random() * 100;
      const newX = this.x + this.dx * jumpDist;
      const newY = this.y + this.dy * jumpDist;
      this.x = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
      this.y = Math.max(bounds.minY, Math.min(bounds.maxY, newY));
    }

    this._updatePosition();
    this.animFrameId = requestAnimationFrame(() => this._animate());
  }

  /** 随机化移动方向 */
  _randomizeDirection() {
    const angle = Math.random() * Math.PI * 2;
    this.dx = Math.cos(angle);
    this.dy = Math.sin(angle);
  }

  /** 更新 DOM 位置 */
  _updatePosition() {
    this.dot.style.left = this.x + 'px';
    this.dot.style.top = this.y + 'px';
  }
}

/**
 * 鸟叫声合成器
 * 使用 <audio> + WAV 生成，兼容 iOS Safari
 */
class BirdSound {
  constructor() {
    this.playing = false;
    this.unlocked = false;
    this.nextChirpTimeout = null;
    this.gestureHandler = null;
    // 预生成几种不同的鸟叫 WAV
    this.chirpAudios = [];
    // 频率级别 1~10，默认 5，映射到基础延迟 2000ms~300ms
    this.freqLevel = 5;
    this._generateChirps();
  }

  /** 预生成鸟叫声音 */
  _generateChirps() {
    const variations = [
      { freq: 2800, sweep: 600, dur: 0.09 },
      { freq: 3400, sweep: 800, dur: 0.07 },
      { freq: 4000, sweep: 500, dur: 0.11 },
      { freq: 2500, sweep: 900, dur: 0.08 },
      { freq: 3600, sweep: 700, dur: 0.1 },
      { freq: 4200, sweep: 400, dur: 0.06 },
    ];
    for (const v of variations) {
      const url = this._createChirpWav(v.freq, v.sweep, v.dur);
      this.chirpAudios.push(url);
    }
  }

  /** 生成单个鸟叫 WAV Blob URL */
  _createChirpWav(baseFreq, sweep, duration) {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * duration);
    const dataSize = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const v = new DataView(buffer);

    // WAV 文件头
    this._writeStr(v, 0, 'RIFF');
    v.setUint32(4, 36 + dataSize, true);
    this._writeStr(v, 8, 'WAVE');
    this._writeStr(v, 12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);   // PCM
    v.setUint16(22, 1, true);   // 单声道
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    this._writeStr(v, 36, 'data');
    v.setUint32(40, dataSize, true);

    // 生成音频采样
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;
      // 频率扫描
      const freq = baseFreq + sweep * Math.sin(progress * Math.PI);
      // 平滑包络
      const envelope = Math.sin(Math.PI * progress);
      const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 1.0;
      v.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)) | 0, true);
    }

    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  }

  _writeStr(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this._waitForGesture();
  }

  _waitForGesture() {
    if (this.unlocked) {
      this._scheduleChirp();
      return;
    }
    if (this.gestureHandler) return;

    this.gestureHandler = () => {
      this.unlocked = true;

      // 立刻播放一声来解锁 iOS 音频
      this._playOne();

      // 开始定时播放
      this._scheduleChirp();

      // 清理事件
      document.removeEventListener('touchend', this.gestureHandler);
      document.removeEventListener('touchstart', this.gestureHandler);
      document.removeEventListener('click', this.gestureHandler);
      this.gestureHandler = null;
    };

    document.addEventListener('touchend', this.gestureHandler);
    document.addEventListener('touchstart', this.gestureHandler);
    document.addEventListener('click', this.gestureHandler);
  }

  /** 播放一声鸟叫 */
  _playOne() {
    const url = this.chirpAudios[Math.floor(Math.random() * this.chirpAudios.length)];
    const audio = new Audio();
    audio.src = url;
    audio.volume = 1.0;
    audio.play().catch(() => {});
  }

  _scheduleChirp() {
    if (!this.playing) return;
    const baseDelay = this._getBaseDelay();
    const jitter = baseDelay * 0.5 * Math.random();
    const delay = baseDelay + jitter;
    this.nextChirpTimeout = setTimeout(() => {
      // 随机 1-3 声连续叫
      const count = Math.random() > 0.5 ? (Math.random() > 0.6 ? 3 : 2) : 1;
      for (let i = 0; i < count; i++) {
        setTimeout(() => this._playOne(), i * (80 + Math.random() * 60));
      }
      this._scheduleChirp();
    }, delay);
  }

  /** 根据 freqLevel 计算基础延迟：1→2000ms，10→300ms */
  _getBaseDelay() {
    return 2000 - (this.freqLevel - 1) * (1700 / 9);
  }

  /** 动态设置鸟叫频率级别 1~10 */
  setFrequency(level) {
    this.freqLevel = Math.max(1, Math.min(10, level));
  }

  stop() {
    this.playing = false;
    if (this.nextChirpTimeout) {
      clearTimeout(this.nextChirpTimeout);
      this.nextChirpTimeout = null;
    }
    if (this.gestureHandler) {
      document.removeEventListener('touchend', this.gestureHandler);
      document.removeEventListener('touchstart', this.gestureHandler);
      document.removeEventListener('click', this.gestureHandler);
      this.gestureHandler = null;
    }
  }
}
