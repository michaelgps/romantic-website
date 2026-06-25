/* =============================================================
   ✨ 你只需要改这个 CONFIG ✨
   每一幕：羊皮纸出现 → 先出文字 → 纸面破开洞、视频晕染播放 → 停留 → 下一幕
   ============================================================= */
const CONFIG = {
  name: "花花",
  startSub: "在 Lost Ark 的星光下，我遇见了你",

  // 六幕已拼成一条连续影片，幕间用交叉淡化衔接（零间隔、纸面永不空白）。
  // sceneStarts = 每一幕在影片里开始浮现的时间点（秒），与交叉淡化时间轴对齐。
  film: "video/film.mp4",
  sceneStarts: [0.5, 6.9, 13.3, 19.7, 26.1, 32.5],
  // pos = 字幕放在画面哪个角的空白区：tl 左上 / tr 右上 / bl 左下 / br 右下
  scenes: [
    { line: "我们的旅程，从 2022 年的 Lost Ark 开始", pos: "tr" },
    { line: "第一只守护者面前，我们第一次并肩", pos: "tl" },
    { line: "后来的每一战，你都在我身边",       pos: "tr" },
    { line: "并肩久了，就成了彼此的人",             pos: "br" },
    { line: "最后那一仗，我们拼尽了全力",         pos: "tl" },
    { line: "然后，各自走向了不同的旅程",         pos: "bl" },
  ],

  // 信（打字机）
  letter:
    "花花：\n\n" +
    "2022 年的二月，我们在 Lost Ark 组到了一起。\n" +
    "一起开荒，一起翻车，从 Argos 打到最后一仗，一晃好几年。\n\n" +
    "谢谢你陪我走了这么远。生日快乐，花花。\n" +
    "愿你往后的每段旅程，都有光，也有人同行。",

  endingEN: "May fate take you to another beautiful journey.",
  endingZH: "愿命运带你走向\n下一段美好的旅程",
  endingSign: "生日快乐，花花 ❤",

  // 时间（毫秒）
  openHold: 1500,       // 点开始后：音乐+开场标题停留多久再化入影片
  textFirst: 1000,      // 开场：文字先出现，再开始晕染播放整片
  letterLineFade: 1100, // 信：每一行依次淡入的间隔
  letterHoldAfter: 4000,
};

/* =============================================================
   播放器
   ============================================================= */
const stage = document.getElementById("stage");
document.getElementById("startName").textContent = CONFIG.name;
document.getElementById("startSub").textContent = CONFIG.startSub;

// 开场：飘动的金色微光
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

// 确保开场背景视频自动播放（静音自动播放偶尔需要轻推一下）
(function playOpeningBg() {
  const bv = document.querySelector(".start-bg-video");
  if (!bv) return;
  bv.muted = true;
  const p = bv.play();
  if (p && p.catch) p.catch(() => {});
})();

const items = [];

// 六幕已拼成一条连续影片（video/film.mp4），幕间零间隔；文字由 JS 按时间叠加
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

// 信（羊皮纸）
const letterEl = document.createElement("section");
letterEl.className = "scene letter";
letterEl.innerHTML = `<div class="paper-bg"></div><div class="letter-wrap"><div class="letter-col"><p class="letter-text"><span id="letterText"></span><span class="letter-caret" id="letterCaret">|</span></p><img class="letter-photo" id="letterPhoto" src="photos/her.jpg" alt=""></div></div>`;
stage.appendChild(letterEl);
items.push({ el: letterEl, type: "letter" });   // 信是最后一屏（已去掉结尾黑场）

const progressFill = document.getElementById("progressFill");
const replayBtn = document.getElementById("replayBtn");
let current = -1;
let timers = [];
function clearTimers() { timers.forEach(clearTimeout); timers = []; }
function after(ms, fn) { timers.push(setTimeout(fn, ms)); }

function go(i) {
  if (i >= items.length) return;
  clearTimers();
  if (current >= 0) {
    const prev = items[current];
    prev.el.classList.remove("active");
    if (prev.caption) prev.caption.classList.remove("show");
    if (prev.video) { try { prev.video.pause(); } catch (e) {} }
  }
  current = i;
  const it = items[i];
  it.el.classList.add("active");

  if (it.type === "film") playFilm(it);
  else if (it.type === "letter") { progressFill.style.width = "100%"; playLetter(); }
}

// 一条连续影片：开场先出文字停一拍，然后从头播到尾（幕间零间隔）；
// 文字在每一幕的开头自动切换。
function playFilm(it) {
  const v = it.video, cap = it.caption;
  const NS = CONFIG.scenes.length;
  const starts = CONFIG.sceneStarts || [];
  let curCap = -2;

  // idx = -1 表示这一刻不显示文字（已淡出、空羊皮纸）
  const showCaption = (idx) => {
    if (idx === curCap) return;
    curCap = idx;
    if (idx < 0) { cap.classList.remove("show"); return; }   // 完全淡出，留空一拍
    const c = CONFIG.scenes[idx]; if (!c) return;
    const set = (sel, txt) => { const el = cap.querySelector(sel); el.textContent = txt || ""; el.style.display = txt ? "" : "none"; };
    set(".cap-stage", c.stage);
    set(".cap-line", c.line);
    set(".cap-date", c.date);
    cap.classList.remove("tl", "tr", "bl", "br");
    cap.classList.add(c.pos || "br");
    cap.classList.remove("show");
    void cap.offsetWidth;                 // 强制以 opacity:0 起步
    cap.classList.add("show");            // 干净淡入（上一句已在空拍里淡出，不会闪现）
  };

  const onTime = () => {
    const dur = v.duration || 39;
    const t = v.currentTime;
    let idx = -1;
    for (let k = 0; k < starts.length; k++) {
      const inStart = starts[k];
      const inEnd = (k + 1 < starts.length ? starts[k + 1] : 1e9) - 1.0;  // 下一幕出现前 1s 先淡出
      if (t >= inStart && t < inEnd) { idx = k; break; }
    }
    showCaption(idx);
    progressFill.style.width = Math.min(90, (t / dur) * 90) + "%";
  };

  try { v.pause(); v.currentTime = 0; } catch (e) {}
  v.removeEventListener("timeupdate", v._onTime || (()=>{}));
  v._onTime = onTime;
  v.addEventListener("timeupdate", onTime);

  let advanced = false;
  const next = () => { if (advanced) return; advanced = true; v.removeEventListener("timeupdate", onTime); go(current + 1); };

  // 停顿与节奏已烤进影片（每段开头 1.2s 羊皮纸再晕染）；这里几乎立即开始播放，
  // 字幕由 onTime 在每段开头 +0.2s 淡入。
  after(150, () => {
    try { v.currentTime = 0; } catch (e) {}
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  });
  // 整片播完 → 信
  v.onended = () => next();
  v.onerror = () => after(45000, next);
  after(65000, next);   // 极端兜底
}

let letterTimer = null;
function playLetter() {
  const wrap = document.querySelector(".letter-text");
  const caret = document.getElementById("letterCaret");
  if (caret) caret.style.display = "none";
  wrap.innerHTML = "";
  const lines = CONFIG.letter.split("\n");
  const els = lines.map((ln) => {
    const d = document.createElement("div");
    d.className = "lt-line";
    if (ln === "") { d.classList.add("lt-blank"); d.innerHTML = "&nbsp;"; }
    else d.textContent = ln;
    wrap.appendChild(d);
    return { d, blank: ln === "" };
  });
  // 逐行淡入：空行直接占位，非空行按节奏依次浮现
  const per = CONFIG.letterLineFade || 1100;
  let step = 0;
  els.forEach(({ d, blank }) => {
    if (blank) { d.classList.add("in"); return; }
    after(400 + step * per, () => d.classList.add("in"));
    step++;
  });
  const linesDone = 400 + step * per;
  // 文字写完后，最后缓缓浮现那张照片（手账风）
  const photo = document.getElementById("letterPhoto");
  if (photo) { photo.classList.remove("in"); after(linesDone + 700, () => photo.classList.add("in")); }
  const total = linesDone + 700 + 1600 + CONFIG.letterHoldAfter;   // 等照片也浮现完再出“重看”
  after(total, () => replayBtn.classList.remove("hidden"));   // 信是最后一屏：音乐继续不断
}

// 背景音乐：尽量在开场画面就响；被浏览器拦截则在第一次交互时立刻淡入
const bgm = document.getElementById("bgm");
const BGM_VOL = 0.6;
let bgmStarted = false;
if (bgm) bgm.src = "music/song.mp3";
let fadeTimer = null;
function fadeAudioTo(target, ms) {
  if (!bgm) return;
  if (fadeTimer) clearInterval(fadeTimer);
  const start = bgm.volume, t0 = Date.now(), step = 50;
  fadeTimer = setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / ms);
    bgm.volume = Math.max(0, Math.min(1, start + (target - start) * k));
    if (k >= 1) { clearInterval(fadeTimer); fadeTimer = null; if (target === 0) { try { bgm.pause(); } catch (e) {} } }
  }, step);
}
function ensureBgm() {
  if (bgmStarted || !bgm) return;
  bgm.volume = BGM_VOL;            // 不淡入，直接正常音量进
  const p = bgm.play();
  if (p && p.then) p.then(() => { bgmStarted = true; }).catch(() => {});
  else bgmStarted = true;
}
// 1) 页面加载就尝试自动播放
ensureBgm();
// 2) 兜底：开场画面上任何一次交互（触碰/点击/按键）立刻开始
["pointerdown", "touchstart", "keydown"].forEach((ev) =>
  document.addEventListener(ev, ensureBgm, { passive: true })
);

// 开始（唯一一次点击）：先让音乐+开场标题停一拍，再化入影片
document.getElementById("startBtn").addEventListener("click", () => {
  ensureBgm();                                  // 音乐立刻淡入
  const btn = document.getElementById("startBtn");
  btn.style.transition = "opacity .6s ease";
  btn.style.opacity = "0"; btn.style.pointerEvents = "none";
  const fv = items[0].video; if (fv) { fv.preload = "auto"; try { fv.load(); } catch (e) {} }
  // 标题随音乐停留一拍，再进入
  after(CONFIG.openHold || 2800, () => {
    document.getElementById("startOverlay").classList.add("hidden");
    document.getElementById("progress").classList.remove("hidden");
    go(0);
  });
});

// 重看
replayBtn.addEventListener("click", () => {
  replayBtn.classList.add("hidden");
  clearTimeout(letterTimer);
  if (bgm) { try { bgm.currentTime = 0; } catch (e) {} }   // 音乐从头（保持播放、不中断）
  go(0);
});
