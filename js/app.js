/**
 * 猫咪自拍助手 - 主逻辑
 * 管理摄像头、连拍流程和 UI 交互
 */
(function () {
  'use strict';

  // ===== DOM 元素 =====
  const video = document.getElementById('camera');
  const canvas = document.getElementById('capture-canvas');
  const ctx = canvas.getContext('2d');
  const overlayMask = document.getElementById('overlay-mask');
  const flash = document.getElementById('flash');
  const btnCapture = document.getElementById('btn-capture');
  const btnToggleDot = document.getElementById('btn-toggle-dot');
  const burstCounter = document.getElementById('burst-counter');
  const burstCount = document.getElementById('burst-count');

  // 设置面板
  const btnSettings = document.getElementById('btn-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const sliderMask = document.getElementById('slider-mask');
  const sliderSpeed = document.getElementById('slider-speed');
  const sliderFreq = document.getElementById('slider-freq');
  const maskValue = document.getElementById('mask-value');
  const speedValue = document.getElementById('speed-value');
  const freqValue = document.getElementById('freq-value');

  // 声控
  const btnVoice = document.getElementById('btn-voice');

  // ===== 状态 =====
  let stream = null;
  let isBursting = false;
  let maskOpacity = 0.3;      // 初始遮罩透明度 30%
  const BURST_COUNT = 12;       // 连拍张数
  const BURST_INTERVAL = 200;   // 连拍间隔（ms）

  // 声控状态
  let voiceActive = false;
  let recognition = null;

  // ===== 控制器 =====
  const dot = new DotController(document.getElementById('red-dot'));
  const gallery = new GalleryManager();

  // ===== 初始化摄像头 =====
  async function initCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      video.srcObject = stream;
      await video.play();

      // 设置 canvas 尺寸匹配视频
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    } catch (err) {
      console.error('摄像头初始化失败:', err);
      alert('无法访问前置摄像头，请确保已授予摄像头权限。');
    }
  }

  // ===== 连拍 =====
  function startBurst() {
    if (isBursting || !stream) return;
    isBursting = true;

    btnCapture.classList.add('bursting');
    burstCounter.classList.remove('hidden');
    burstCount.textContent = '0';

    // 确保 canvas 尺寸与视频匹配
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const photos = [];
    let count = 0;

    // 隐藏遮罩，但红点保持移动
    if (maskOpacity > 0) {
      overlayMask.classList.add('disabled');
    }

    function captureFrame() {
      if (count >= BURST_COUNT) {
        finishBurst(photos);
        return;
      }

      // 闪光效果
      flash.classList.add('flash');
      setTimeout(() => flash.classList.remove('flash'), 60);

      // 截帧
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      photos.push(canvas.toDataURL('image/jpeg', 0.92));

      count++;
      burstCount.textContent = count;

      setTimeout(captureFrame, BURST_INTERVAL);
    }

    // 短暂延迟确保遮罩已隐藏
    setTimeout(captureFrame, 80);
  }

  function finishBurst(photos) {
    isBursting = false;
    btnCapture.classList.remove('bursting');
    burstCounter.classList.add('hidden');

    // 恢复遮罩（红点一直在移动，无需恢复）
    if (maskOpacity > 0) {
      overlayMask.classList.remove('disabled');
    }

    // 添加到相册
    gallery.addPhotos(photos);
  }

  // ===== 设置面板 =====
  function openSettings() {
    settingsPanel.classList.remove('hidden');
    // 强制重排后触发动画
    void settingsPanel.offsetHeight;
  }

  function closeSettings() {
    settingsPanel.classList.add('hidden');
  }

  function updateMaskOpacity(val) {
    maskOpacity = val / 100;
    overlayMask.style.background = 'rgba(0, 0, 0, ' + maskOpacity + ')';
    overlayMask.classList.remove('disabled');
    maskValue.textContent = val + '%';
  }

  // ===== 声控拍照 =====
  function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('此浏览器不支持 Web Speech API');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onresult = function (event) {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (transcript.includes('拍照') || transcript.includes('拍')) {
          startBurst();
          break;
        }
      }
    };

    recognition.onerror = function (e) {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('语音识别错误:', e.error);
      }
    };

    recognition.onend = function () {
      // iOS Safari 每次识别有超时，自动重启
      if (voiceActive) {
        try {
          recognition.start();
        } catch (e) {
          // 忽略已经在运行的错误
        }
      }
    };
  }

  function toggleVoice() {
    if (!recognition) {
      alert('此浏览器不支持语音识别功能');
      return;
    }

    voiceActive = !voiceActive;
    btnVoice.classList.toggle('voice-on', voiceActive);

    if (voiceActive) {
      try {
        recognition.start();
      } catch (e) {
        // 可能已经在运行
      }
    } else {
      try {
        recognition.stop();
      } catch (e) {
        // 忽略
      }
    }
  }

  // ===== UI 事件绑定 =====
  function bindEvents() {
    // 拍照按钮
    btnCapture.addEventListener('click', startBurst);

    // 红点开关
    btnToggleDot.addEventListener('click', () => {
      const enabled = dot.toggle();
      btnToggleDot.classList.toggle('active', enabled);
      btnToggleDot.classList.toggle('inactive', !enabled);
    });
    btnToggleDot.classList.add('active');

    // 设置面板打开/关闭
    btnSettings.addEventListener('click', openSettings);
    btnCloseSettings.addEventListener('click', closeSettings);
    settingsPanel.addEventListener('click', (e) => {
      if (e.target === settingsPanel) closeSettings();
    });

    // 背景明暗滑块
    sliderMask.addEventListener('input', (e) => {
      updateMaskOpacity(parseInt(e.target.value, 10));
    });

    // 红点速度滑块
    sliderSpeed.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      dot.setSpeed(val);
      speedValue.textContent = val;
    });

    // 鸟叫频率滑块
    sliderFreq.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      dot.birdSound.setFrequency(val);
      freqValue.textContent = val;
    });

    // 声控按钮
    btnVoice.addEventListener('click', toggleVoice);

    // 窗口大小变化时更新红点位置
    window.addEventListener('resize', () => {
      dot.updateLensPosition();
    });
  }

  // ===== 启动 =====
  async function init() {
    bindEvents();
    initVoiceRecognition();
    // 初始设置遮罩样式
    updateMaskOpacity(30);
    await initCamera();
    dot.start();
  }

  // 等待 DOM 就绪
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ===== 注册 Service Worker =====
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {
      // Service Worker 注册失败，不影响使用
    });
  }
})();
