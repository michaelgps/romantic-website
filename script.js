const CONFIG = {
  name: "花花",
  startSub: "在 Lost Ark 的星光下，我遇见了你",
  introLine: "这一路的回忆，我想慢慢说给你听。",

  film: "video/film.mp4",
  sceneStarts: [0.5, 6.9, 13.3, 19.7, 26.1, 32.5],
  scenes: [
    { line: "我们的旅程，从 2022 年的 Lost Ark 开始", pos: "tr" },
    { line: "第一只守护者面前，我们第一次并肩", pos: "tl" },
    { line: "后来的每一战，你都在我身边", pos: "tr" },
    { line: "并肩久了，就成了彼此的人", pos: "br" },
    { line: "终幕之战，我们拼尽了全力", pos: "tl" },
    { line: "然后，各自走向了不同的旅程", pos: "bl" }
  ],

  letter:
    "花花：\n\n" +
    "2022 年的二月，我们在 Lost Ark 组到了一起。\n" +
    "一起开荒，一起翻车，从日月鹿打到终幕之战，一晃好几年。\n\n" +
    "谢谢你陪我走了这么远。生日快乐，花花。\n" +
    "愿你往后的每段旅程，都有光，也有人同行。",

  openHold: 9300,
  letterLineFade: 1100,
  letterHoldAfter: 4000
};

const stage = document.getElementById("stage");
const startOverlay = document.getElementById("startOverlay");
const startBtn = document.getElementById("startBtn");
const startSub = document.getElementById("startSub");
const startTitle = document.querySelector(".start-title");
const introLine1 = document.getElementById("introLine1");
const progressFill = document.getElementById("progressFill");
const replayBtn = document.getElementById("replayBtn");

document.getElementById("startName").textContent = CONFIG.name;
startSub.textContent = CONFIG.startSub;
introLine1.textContent = CONFIG.introLine;

(function makeEmbers() {
  const ov = document.getElementById("startOverlay");
  if (!ov) return;
  const layer = document.createElement("div");
  layer.className = "embers";
  for (let i = 0; i < 14; i++) {
    const e = document.createElement("span");
    e.className = "ember";
    const s = 3 + Math.random() * 5;
    e.style.left = (Math.random() * 100) + "%";
    e.style.width = e.style.height = s.toFixed(1) + "px";
    e.style.animationDuration = (11 + Math.random() * 12).toFixed(1) + "s";
    e.style.animationDelay = (-Math.random() * 14).toFixed(1) + "s";
    layer.appendChild(e);
  }
  ov.insertBefore(layer, ov.firstChild);
})();

(function playOpeningBg() {
  const bv = document.querySelector(".start-bg-video");
  if (!bv) return;
  bv.muted = true;
  const p = bv.play();
  if (p && p.catch) p.catch(() => {});
})();

const items = [];

const filmEl = document.createElement("section");
filmEl.className = "scene film";
filmEl.innerHTML = `
  <video id="filmVideo" class="scene-video" muted playsinline preload="auto" poster="photos/paper.jpg">
    <source src="${CONFIG.film}" type="video/mp4">
  </video>
  <div class="scene-caption" id="filmCaption">
    <div class="cap-stage"></div>
    <div class="cap-line"></div>
    <div class="cap-date"></div>
  </div>`;
stage.appendChild(filmEl);
items.push({ el: filmEl, type: "film", video: filmEl.querySelector("video"), caption: filmEl.querySelector(".scene-caption") });

const letterEl = document.createElement("section");
letterEl.className = "scene letter";
letterEl.innerHTML = `<div class="paper-bg"></div><div class="letter-wrap"><div class="letter-col"><p class="letter-text"><span id="letterText"></span><span class="letter-caret" id="letterCaret">|</span></p><img class="letter-photo" id="letterPhoto" src="photos/her.jpg" alt=""></div></div>`;
stage.appendChild(letterEl);
items.push({ el: letterEl, type: "letter" });

let current = -1;
let timers = [];
let started = false;
let letterTimer = null;

function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

function after(ms, fn) {
  timers.push(setTimeout(fn, ms));
}

function go(i) {
  if (i >= items.length) return;
  clearTimers();
  if (current >= 0) {
    const prev = items[current];
    prev.el.classList.remove("active");
    if (prev.caption) prev.caption.classList.remove("show");
    if (prev.video) {
      try { prev.video.pause(); } catch (e) {}
    }
  }
  current = i;
  const it = items[i];
  it.el.classList.add("active");

  if (it.type === "film") playFilm(it);
  else if (it.type === "letter") {
    progressFill.style.width = "100%";
    playLetter();
  }
}

function playFilm(it) {
  const v = it.video;
  const cap = it.caption;
  const starts = CONFIG.sceneStarts || [];
  let curCap = -2;

  const showCaption = (idx) => {
    if (idx === curCap) return;
    curCap = idx;
    if (idx < 0) {
      cap.classList.remove("show");
      return;
    }
    const c = CONFIG.scenes[idx];
    if (!c) return;
    const set = (sel, txt) => {
      const el = cap.querySelector(sel);
      el.textContent = txt || "";
      el.style.display = txt ? "" : "none";
    };
    set(".cap-stage", c.stage);
    set(".cap-line", c.line);
    set(".cap-date", c.date);
    cap.classList.remove("tl", "tr", "bl", "br");
    cap.classList.add(c.pos || "br");
    cap.classList.remove("show");
    void cap.offsetWidth;
    cap.classList.add("show");
  };

  const onTime = () => {
    const dur = v.duration || 39;
    const t = v.currentTime;
    let idx = -1;
    for (let k = 0; k < starts.length; k++) {
      const inStart = starts[k];
      const inEnd = (k + 1 < starts.length ? starts[k + 1] : 1e9) - 1.0;
      if (t >= inStart && t < inEnd) {
        idx = k;
        break;
      }
    }
    showCaption(idx);
    progressFill.style.width = Math.min(90, (t / dur) * 90) + "%";
  };

  try {
    v.pause();
    v.currentTime = 0;
  } catch (e) {}
  if (v._onTime) v.removeEventListener("timeupdate", v._onTime);
  v._onTime = onTime;
  v.addEventListener("timeupdate", onTime);

  let advanced = false;
  const next = () => {
    if (advanced) return;
    advanced = true;
    v.removeEventListener("timeupdate", onTime);
    go(current + 1);
  };

  after(150, () => {
    try { v.currentTime = 0; } catch (e) {}
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  });
  v.onended = () => next();
  v.onerror = () => after(45000, next);
  after(65000, next);
}

function playLetter() {
  const wrap = document.querySelector(".letter-text");
  const caret = document.getElementById("letterCaret");
  if (caret) caret.style.display = "none";
  wrap.innerHTML = "";
  const lines = CONFIG.letter.split("\n");
  const els = lines.map((ln) => {
    const d = document.createElement("div");
    d.className = "lt-line";
    if (ln === "") {
      d.classList.add("lt-blank");
      d.innerHTML = "&nbsp;";
    } else {
      d.textContent = ln;
    }
    wrap.appendChild(d);
    return { d, blank: ln === "" };
  });

  const per = CONFIG.letterLineFade || 1100;
  let step = 0;
  els.forEach(({ d, blank }) => {
    if (blank) {
      d.classList.add("in");
      return;
    }
    after(400 + step * per, () => d.classList.add("in"));
    step++;
  });

  const linesDone = 400 + step * per;
  const photo = document.getElementById("letterPhoto");
  if (photo) {
    photo.classList.remove("in");
    after(linesDone + 700, () => photo.classList.add("in"));
  }
  const total = linesDone + 700 + 1600 + CONFIG.letterHoldAfter;
  after(total, () => replayBtn.classList.remove("hidden"));
}

const bgm = document.getElementById("bgm");
const BGM_VOL = 0.6;
let bgmStarted = false;
if (bgm) bgm.src = "music/song.mp3";

function ensureBgm() {
  if (bgmStarted || !bgm) return;
  bgm.volume = BGM_VOL;
  const p = bgm.play();
  if (p && p.then) p.then(() => { bgmStarted = true; }).catch(() => {});
  else bgmStarted = true;
}

function startExperience() {
  if (started) return;
  started = true;
  ensureBgm();
  startOverlay.classList.add("playing");
  const fv = items[0].video;
  if (fv) {
    fv.preload = "auto";
    try { fv.load(); } catch (e) {}
  }

  after(900, () => startSub.classList.add("show"));
  after(3150, () => startTitle.classList.add("show"));
  after(5950, () => introLine1.classList.add("show"));
  after(CONFIG.openHold || 9300, () => {
    startOverlay.classList.add("hidden");
    document.getElementById("progress").classList.remove("hidden");
    go(0);
  });
}

startBtn.addEventListener("click", startExperience);

replayBtn.addEventListener("click", () => {
  replayBtn.classList.add("hidden");
  clearTimeout(letterTimer);
  go(0);
});
