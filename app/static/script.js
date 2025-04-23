// 🎞 script.js（再生特化 改良版 + スライダー対応 + WebM保存機能）

let frames = [];
let currentFrame = 0;
let playing = false;
let loop = true;
let fps = 24;
let rafId = null;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("fileInput");
const seekbar = document.getElementById("seekbar");
const speedRange = document.getElementById("speedRange");
const speedDisplay = document.getElementById("speedDisplay");
const frameInfo = document.getElementById("frameInfo");
const loopToggle = document.getElementById("loopToggle");
const saveProgress = document.getElementById("saveProgress");

fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;

  playing = false;
  cancelAnimationFrame(rafId);
  frames = [];
  currentFrame = 0;

  const formData = new FormData();
  formData.append("file", file);
  const saveFlag = document.getElementById("saveCheckbox").checked;
  formData.append("save", saveFlag ? "true" : "false");

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!data.frame_urls) return;

  frames = data.frame_urls.map(url => {
    const img = new Image();
    img.src = url;
    return img;
  });

  frames[0].onload = () => {
    canvas.width = frames[0].naturalWidth;
    canvas.height = frames[0].naturalHeight;
    updateCanvas();
  };

  seekbar.max = frames.length - 1;
  seekbar.value = 0;
});

function play() {
  if (frames.length === 0) return;
  playing = true;
  updatePlayback();
}

function pause() {
  playing = false;
  cancelAnimationFrame(rafId);
  if (!document.getElementById("saveCheckbox").checked) {
    fetch("/cleanup", { method: "POST" });
  }
}

function prevFrame() {
  currentFrame = Math.max(0, currentFrame - 1);
  updateCanvas();
}

function nextFrame() {
  currentFrame = Math.min(frames.length - 1, currentFrame + 1);
  updateCanvas();
}

function updateCanvas() {
  if (!frames[currentFrame]) return;
  const img = frames[currentFrame];
  if (!img.complete) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  seekbar.value = currentFrame;
  frameInfo.textContent = `Frame ${currentFrame + 1} / ${frames.length}`;
}

function resetFrame() {
  currentFrame = 0;
  updateCanvas();
}

function updatePlayback() {
  const speed = parseFloat(speedRange.value);
  speedDisplay.textContent = speed.toFixed(2) + "x";
  fps = 24 * speed;
  let lastTime = performance.now();
  let acc = 0;

  function loopFrame(now) {
    if (!playing) return;
    acc += now - lastTime;
    lastTime = now;

    const interval = 1000 / fps;
    if (acc >= interval) {
      acc %= interval;
      currentFrame++;
      if (currentFrame >= frames.length) {
        if (loopToggle.checked) {
          currentFrame = 0;
        } else {
          pause();
          return;
        }
      }
      updateCanvas();
    }
    rafId = requestAnimationFrame(loopFrame);
  }

  requestAnimationFrame(loopFrame);
}

seekbar.addEventListener("input", () => {
  currentFrame = parseInt(seekbar.value);
  updateCanvas();
});

speedRange.addEventListener("input", () => {
  speedDisplay.textContent = parseFloat(speedRange.value).toFixed(2) + "x";
  if (playing) {
    cancelAnimationFrame(rafId);
    updatePlayback();
  }
});

loopToggle.addEventListener("change", () => {
  loop = loopToggle.checked;
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    canvas.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  if (frames.length === 0) return;
  if (e.deltaY < 0) prevFrame();
  else nextFrame();
});

document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

  if (e.code === "Space") {
    e.preventDefault();
    if (playing) pause();
    else play();
  } else if (e.code === "ArrowLeft") {
    prevFrame();
  } else if (e.code === "ArrowRight") {
    nextFrame();
  } else if (e.code === "Home") {
    resetFrame();
  }
});

async function saveAsWebM() {
  if (frames.length === 0) return;

  const speed = parseFloat(speedRange.value);
  const fps = 24 * speed;
  const capturer = new CCapture({ format: 'webm', framerate: fps });

  let index = 0;
  capturer.start();

  function renderFrame() {
    if (index >= frames.length) {
      capturer.stop();
      capturer.save();
      saveProgress.textContent = "保存完了";
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frames[index], 0, 0, canvas.width, canvas.height);
    capturer.capture(canvas);

    saveProgress.textContent = `保存中... (${index + 1} / ${frames.length})`;
    index++;
    setTimeout(renderFrame, 1000 / fps);
  }

  renderFrame();
}