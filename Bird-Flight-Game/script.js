const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const overlay = document.getElementById("overlay");
const overlayEyebrow = document.getElementById("overlayEyebrow");
const overlayTitle = document.getElementById("overlayTitle");
const overlayCopy = document.getElementById("overlayCopy");
const startButton = document.getElementById("startButton");

const GAME_WIDTH = 800;
const GAME_HEIGHT = 500;
const GROUND_HEIGHT = 58;
const BIRD_X = 185;
const BIRD_RADIUS = 17;
const GRAVITY = 950;
const FLAP_POWER = -340;
const PIPE_WIDTH = 78;
const PIPE_GAP = 158;
const PIPE_SPACING = 285;

let bird;
let pipes;
let clouds;
let score;
let gameState = "ready"; // ready, playing, over
let lastTime = 0;
let spawnDistance = 0;
let groundOffset = 0;
let animationFrame;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.width * (GAME_HEIGHT / GAME_WIDTH) * dpr);
  ctx.setTransform(canvas.width / GAME_WIDTH, 0, 0, canvas.height / GAME_HEIGHT, 0, 0);
  draw();
}

function resetGame() {
  bird = { x: BIRD_X, y: GAME_HEIGHT * 0.45, vy: 0, rotation: 0 };
  pipes = [];
  clouds = [
    { x: 70, y: 80, scale: 1.0 },
    { x: 350, y: 135, scale: 0.72 },
    { x: 650, y: 65, scale: 1.15 },
    { x: 500, y: 230, scale: 0.62 }
  ];
  score = 0;
  spawnDistance = 0;
  groundOffset = 0;
  scoreElement.textContent = "0";
}

function startGame() {
  resetGame();
  gameState = "playing";
  overlay.classList.add("hidden");
  lastTime = performance.now();
  flap();
}

function flap() {
  if (gameState === "ready") {
    startGame();
    return;
  }
  if (gameState === "over") return;
  bird.vy = FLAP_POWER;
}

function endGame() {
  if (gameState !== "playing") return;
  gameState = "over";
  overlayEyebrow.textContent = "FLIGHT COMPLETE";
  overlayTitle.textContent = "Game Over!";
  overlayCopy.textContent = `You scored ${score} point${score === 1 ? "" : "s"}. Ready to give it another try?`;
  startButton.innerHTML = 'Play Again <span aria-hidden="true">↻</span>';
  overlay.classList.remove("hidden");
}

function showReadyScreen() {
  overlayEyebrow.textContent = "READY TO FLY?";
  overlayTitle.textContent = "Bird Flight";
  overlayCopy.textContent = "Tap, click, or press Space to flap. Fly through the gaps and avoid the pipes!";
  startButton.innerHTML = 'Start Flying <span aria-hidden="true">➜</span>';
  overlay.classList.remove("hidden");
}

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.beginPath();
  ctx.ellipse(0, 7, 35, 15, 0, 0, Math.PI * 2);
  ctx.ellipse(-17, 0, 18, 17, 0, 0, Math.PI * 2);
  ctx.ellipse(4, -8, 23, 23, 0, 0, Math.PI * 2);
  ctx.ellipse(25, 3, 17, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, "#72d4ff");
  sky.addColorStop(0.72, "#b8edff");
  sky.addColorStop(1, "#e1f9ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Sun glow
  const glow = ctx.createRadialGradient(660, 80, 5, 660, 80, 75);
  glow.addColorStop(0, "rgba(255,245,168,.9)");
  glow.addColorStop(1, "rgba(255,245,168,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(570, 0, 180, 170);
  ctx.fillStyle = "#fff2a1";
  ctx.beginPath();
  ctx.arc(660, 80, 29, 0, Math.PI * 2);
  ctx.fill();

  clouds.forEach(cloud => drawCloud(cloud.x, cloud.y, cloud.scale));

  // Distant rolling hills
  ctx.fillStyle = "#8bdcaa";
  ctx.beginPath();
  ctx.moveTo(0, 385);
  ctx.quadraticCurveTo(130, 300, 260, 380);
  ctx.quadraticCurveTo(390, 430, 530, 350);
  ctx.quadraticCurveTo(680, 285, 800, 370);
  ctx.lineTo(800, GAME_HEIGHT);
  ctx.lineTo(0, GAME_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#63cc8d";
  ctx.beginPath();
  ctx.moveTo(0, 425);
  ctx.quadraticCurveTo(160, 355, 310, 425);
  ctx.quadraticCurveTo(510, 475, 650, 410);
  ctx.quadraticCurveTo(730, 380, 800, 420);
  ctx.lineTo(800, GAME_HEIGHT);
  ctx.lineTo(0, GAME_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawPipe(pipe) {
  const bottomY = pipe.gapY + PIPE_GAP / 2;
  const topBottom = pipe.gapY - PIPE_GAP / 2;
  const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
  gradient.addColorStop(0, "#168d48");
  gradient.addColorStop(0.22, "#42d66e");
  gradient.addColorStop(0.55, "#2fbd5a");
  gradient.addColorStop(1, "#11783c");

  // Top pipe
  ctx.fillStyle = gradient;
  ctx.fillRect(pipe.x + 7, 0, PIPE_WIDTH - 14, topBottom - 17);
  ctx.fillStyle = "#188a43";
  ctx.fillRect(pipe.x + 3, topBottom - 22, PIPE_WIDTH - 6, 22);
  ctx.fillStyle = "#4be477";
  ctx.fillRect(pipe.x + 9, topBottom - 19, 9, 15);
  ctx.strokeStyle = "#126d38";
  ctx.lineWidth = 3;
  ctx.strokeRect(pipe.x + 7, 0, PIPE_WIDTH - 14, topBottom - 17);
  ctx.strokeRect(pipe.x + 3, topBottom - 22, PIPE_WIDTH - 6, 22);

  // Bottom pipe
  ctx.fillStyle = gradient;
  ctx.fillRect(pipe.x + 7, bottomY + 17, PIPE_WIDTH - 14, GAME_HEIGHT - GROUND_HEIGHT - bottomY);
  ctx.fillStyle = "#188a43";
  ctx.fillRect(pipe.x + 3, bottomY, PIPE_WIDTH - 6, 22);
  ctx.fillStyle = "#4be477";
  ctx.fillRect(pipe.x + 9, bottomY + 3, 9, 15);
  ctx.strokeStyle = "#126d38";
  ctx.strokeRect(pipe.x + 7, bottomY + 17, PIPE_WIDTH - 14, GAME_HEIGHT - GROUND_HEIGHT - bottomY);
  ctx.strokeRect(pipe.x + 3, bottomY, PIPE_WIDTH - 6, 22);
}

function drawGround() {
  const y = GAME_HEIGHT - GROUND_HEIGHT;
  ctx.fillStyle = "#e9d77d";
  ctx.fillRect(0, y, GAME_WIDTH, GROUND_HEIGHT);
  ctx.fillStyle = "#78d64b";
  ctx.fillRect(0, y, GAME_WIDTH, 13);
  ctx.fillStyle = "#4fbf43";
  for (let x = -30 + (groundOffset % 40); x < GAME_WIDTH + 40; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, y + 1);
    ctx.lineTo(x + 13, y + 13);
    ctx.lineTo(x + 26, y + 1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#d7bd62";
  ctx.fillRect(0, y + 18, GAME_WIDTH, 4);
  ctx.fillStyle = "#f5e6a0";
  ctx.fillRect(0, y + 25, GAME_WIDTH, 4);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Tail feathers
  ctx.fillStyle = "#f18b27";
  ctx.beginPath();
  ctx.moveTo(-17, 2);
  ctx.lineTo(-29, -5);
  ctx.lineTo(-26, 7);
  ctx.lineTo(-17, 10);
  ctx.fill();

  // Body
  ctx.fillStyle = "#ffca3a";
  ctx.beginPath();
  ctx.ellipse(0, 0, 21, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#df8b24";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Wing
  ctx.fillStyle = "#f4a928";
  ctx.beginPath();
  ctx.ellipse(-4, 5 + (gameState === "playing" ? Math.sin(performance.now() / 65) * 2 : 0), 10, 7, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#dc8b22";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(9, -6, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#18354a";
  ctx.beginPath();
  ctx.arc(11, -6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(12, -7, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = "#ff7b32";
  ctx.beginPath();
  ctx.moveTo(17, -1);
  ctx.lineTo(30, 3);
  ctx.lineTo(17, 7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#d95d24";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

function draw() {
  if (!ctx) return;
  drawBackground();
  pipes.forEach(drawPipe);
  drawGround();
  if (bird) drawBird();

  if (gameState === "playing") {
    // Small instruction label
    ctx.fillStyle = "rgba(255,255,255,.8)";
    roundedRect(18, 18, 120, 36, 12);
    ctx.fill();
    ctx.fillStyle = "#28607d";
    ctx.font = "800 14px Nunito, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KEEP FLYING!", 78, 41);
  }
}

function circlesOverlapRect(cx, cy, radius, rx, ry, rw, rh) {
  const nearestX = Math.max(rx, Math.min(cx, rx + rw));
  const nearestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function checkCollision(pipe) {
  const topBottom = pipe.gapY - PIPE_GAP / 2;
  const bottomTop = pipe.gapY + PIPE_GAP / 2;
  const topHit = circlesOverlapRect(bird.x, bird.y, BIRD_RADIUS, pipe.x + 3, 0, PIPE_WIDTH - 6, topBottom);
  const bottomHit = circlesOverlapRect(bird.x, bird.y, BIRD_RADIUS, pipe.x + 3, bottomTop, PIPE_WIDTH - 6, GAME_HEIGHT - GROUND_HEIGHT - bottomTop);
  return topHit || bottomHit;
}

function update(dt) {
  if (gameState !== "playing") {
    // Gentle bobbing on the title screen
    if (gameState === "ready") {
      bird.y = GAME_HEIGHT * 0.45 + Math.sin(performance.now() / 300) * 8;
      bird.rotation = Math.sin(performance.now() / 300) * 0.05;
    }
    return;
  }

  bird.vy += GRAVITY * dt;
  bird.y += bird.vy * dt;
  bird.rotation = Math.max(-0.45, Math.min(1.15, bird.vy / 650));

  const speed = 130;
  groundOffset += speed * dt;

  clouds.forEach(cloud => {
    cloud.x -= speed * 0.12 * dt;
    if (cloud.x < -65) cloud.x = GAME_WIDTH + 50;
  });

  spawnDistance += speed * dt;
  if (pipes.length === 0 || spawnDistance >= PIPE_SPACING) {
    const margin = 100;
    const minGapY = margin + PIPE_GAP / 2;
    const maxGapY = GAME_HEIGHT - GROUND_HEIGHT - margin - PIPE_GAP / 2;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);
    pipes.push({ x: GAME_WIDTH + 20, gapY, scored: false });
    spawnDistance = 0;
  }

  pipes.forEach(pipe => {
    pipe.x -= speed * dt;
    if (!pipe.scored && pipe.x + PIPE_WIDTH < bird.x) {
      pipe.scored = true;
      score += 1;
      scoreElement.textContent = String(score);
    }
    if (checkCollision(pipe)) endGame();
  });
  pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -10);

  if (bird.y - BIRD_RADIUS < 0 || bird.y + BIRD_RADIUS > GAME_HEIGHT - GROUND_HEIGHT) {
    endGame();
  }
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.035);
  lastTime = timestamp;
  update(dt);
  draw();
  animationFrame = requestAnimationFrame(loop);
}

startButton.addEventListener("click", () => {
  if (gameState === "over" || gameState === "ready") startGame();
});

canvas.addEventListener("pointerdown", event => {
  event.preventDefault();
  if (gameState === "over") return;
  flap();
});

window.addEventListener("keydown", event => {
  if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
    event.preventDefault();
    if (gameState === "over") return;
    flap();
  }
  if (event.code === "Enter" && gameState !== "playing") startGame();
});

window.addEventListener("resize", resizeCanvas);

resetGame();
resizeCanvas();
showReadyScreen();
lastTime = performance.now();
cancelAnimationFrame(animationFrame);
animationFrame = requestAnimationFrame(loop);
