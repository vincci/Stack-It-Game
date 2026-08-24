  const BLOCK_HEIGHT = 34;
  const BASE_WIDTH = 240;
  const PERFECT_MARGIN = 5;
  const START_SPEED = 190;
  const MAX_SPEED = 420;
  const BIRTHDAY_HEIGHT = 13;
  const MAX_SHRINK = 0.2;
  const SPEED_GROWTH = 1.15;
  const CANDLE_SCALE = 1.2;
  const CANDLE_FIXED_WIDTH = BASE_WIDTH / 20;

  const board = requireElement("gameBoard");
  const stackLayer = requireElement("stackLayer");
  const startScreen = requireElement("startScreen");
  const startButton = requireElement("startButton");
  const gameOver = requireElement("gameOver");
  const playAgainButton = requireElement("playAgainButton");
  const finalScoreElement = requireElement("finalScore");
  const perfectCallout = requireElement("perfectCallout");
  const birthdayBanner = requireElement("birthdayBanner");
  const landing = requireElement("landing");
  const landingButton = requireElement("landingButton");
  const cardPlayAgainButton = requireElement("cardPlayAgain");

  const tones = ["tomato", "mustard", "mint", "sky", "lilac", "cream"];
  const jsConfetti = new JSConfetti();
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let state = "idle";
  let tower = [];
  let movingBlock = null;
  let score = 0;
  let direction = 1;
  let speed = START_SPEED;
  let lastFrameTime = 0;
  let animationFrame = 0;
  let perfectTimer = 0;
  let perfectPauseTimer = 0;
  let confettiTimer = 0;
  let flameTimer = 0;
  let birthdayTimer = 0;
  let hasCelebratedBirthday = false;

  function requireElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing required element: #${id}`);
    }
    return element;
  }

  function boardSize() {
    const rect = board.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function createBlock(x, y, width, tone, className = "tower-block", height = BLOCK_HEIGHT) {
    const element = document.createElement("div");
    element.className = className;
    element.dataset.tone = tone;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.setProperty("--bx", `${x}px`);
    element.style.setProperty("--by", `${y}px`);

    const studs = document.createElement("span");
    if (className.includes("is-candle")) {
      studs.className = "candle-flame";
    } else {
      studs.className = "block-studs";
      const studCount = Math.max(2, Math.floor(width / 44));
      for (let index = 0; index < studCount; index += 1) {
        studs.append(document.createElement("i"));
      }
    }

    element.append(studs);
    stackLayer.append(element);

    return { element, x, y, width, height };
  }

  function positionBlock(block) {
    block.element.style.width = `${block.width}px`;
    block.element.style.setProperty("--bx", `${block.x}px`);
    block.element.style.setProperty("--by", `${block.y}px`);
  }

  function resetGame() {
    cancelAnimationFrame(animationFrame);
    window.clearTimeout(perfectTimer);
    window.clearTimeout(perfectPauseTimer);
    window.clearTimeout(confettiTimer);
    window.clearTimeout(flameTimer);
    window.clearTimeout(birthdayTimer);

    state = "playing";
    score = 0;
    speed = START_SPEED;
    direction = Math.random() > 0.5 ? 1 : -1;
    lastFrameTime = 0;
    movingBlock = null;
    tower = [];
    hasCelebratedBirthday = false;

    gameOver.hidden = true;
    startScreen.hidden = true;
    perfectCallout.classList.remove("is-visible");
    birthdayBanner.hidden = true;
    birthdayBanner.classList.remove("is-visible");
    jsConfetti.clearCanvas();
    stackLayer.replaceChildren();
    board.classList.remove("is-over", "is-perfect", "is-complete");
    board.classList.add("is-playing");

    const size = boardSize();
    const baseY = size.height - BLOCK_HEIGHT - 34;
    const baseX = (size.width - BASE_WIDTH) / 2;
    const base = createBlock(baseX, baseY, BASE_WIDTH, "cream", "tower-block is-base");

    tower.push(base);
    spawnMovingBlock();
    board.focus({ preventScroll: true });
    animationFrame = requestAnimationFrame(animate);
  }

  function spawnMovingBlock() {
    const previous = tower[tower.length - 1];
    const size = boardSize();
    const isFinalTier = score + 1 === BIRTHDAY_HEIGHT;
    const width = isFinalTier ? CANDLE_FIXED_WIDTH : previous.width;
    const tierHeight = isFinalTier ? BLOCK_HEIGHT * CANDLE_SCALE : BLOCK_HEIGHT;
    const y = previous.y - tierHeight;
    const entersFromLeft = direction > 0;
    const x = entersFromLeft ? -width : size.width;
    const tone = isFinalTier ? "candle" : tones[score % tones.length];
    const className = isFinalTier ? "tower-block is-moving is-candle" : "tower-block is-moving";

    movingBlock = createBlock(x, y, width, tone, className, tierHeight);
  }

  function animate(time) {
    if (state !== "playing" || !movingBlock) {
      return;
    }

    if (!lastFrameTime) {
      lastFrameTime = time;
    }

    const delta = Math.min((time - lastFrameTime) / 1000, 0.04);
    lastFrameTime = time;

    const size = boardSize();
    movingBlock.x += direction * speed * delta;

    if (direction > 0 && movingBlock.x >= size.width - movingBlock.width) {
      movingBlock.x = size.width - movingBlock.width;
      direction = -1;
    } else if (direction < 0 && movingBlock.x <= 0) {
      movingBlock.x = 0;
      direction = 1;
    }

    positionBlock(movingBlock);
    animationFrame = requestAnimationFrame(animate);
  }

  function dropBlock() {
    if (state !== "playing" || !movingBlock) {
      return;
    }

    const previous = tower[tower.length - 1];
    const current = movingBlock;
    const currentRight = current.x + current.width;
    const previousRight = previous.x + previous.width;
    let overlapStart = Math.max(current.x, previous.x);
    let overlapEnd = Math.min(currentRight, previousRight);
    const rawOverlap = overlapEnd - overlapStart;
    let overlap = rawOverlap;

    if (rawOverlap <= 0) {
      dropMissedBlock(current);
      finishGame();
      return;
    }

    const offset = current.x - previous.x;
    const isPerfect = Math.abs(offset) <= PERFECT_MARGIN;

    if (isPerfect) {
      overlapStart = previous.x;
      overlapEnd = previousRight;
      overlap = previous.width;
    } else {
      const minWidth = previous.width * (1 - MAX_SHRINK);
      if (rawOverlap < minWidth) {
        const center = (overlapStart + overlapEnd) / 2;
        let clampedStart = center - minWidth / 2;
        let clampedEnd = center + minWidth / 2;
        if (clampedStart < previous.x) {
          clampedStart = previous.x;
          clampedEnd = clampedStart + minWidth;
        } else if (clampedEnd > previousRight) {
          clampedEnd = previousRight;
          clampedStart = clampedEnd - minWidth;
        }
        overlapStart = Math.max(clampedStart, current.x);
        overlapEnd = Math.min(clampedEnd, current.x + current.width);
        overlap = overlapEnd - overlapStart;
      }
      createTrimmedPiece(current, overlapStart, overlapEnd);
    }

    current.x = overlapStart;
    current.width = overlap;
    current.element.classList.remove("is-moving");
    current.element.classList.add("is-placed");
    positionBlock(current);

    previous.element.classList.remove("is-squashed");
    void previous.element.offsetWidth;
    previous.element.classList.add("is-squashed");

    tower.push(current);
    movingBlock = null;
    score += 1;
    speed = Math.min(MAX_SPEED, speed * SPEED_GROWTH);

    if (!hasCelebratedBirthday && score >= BIRTHDAY_HEIGHT) {
      hasCelebratedBirthday = true;
      state = "complete";
      board.classList.remove("is-playing");
      board.classList.add("is-complete");
      cancelAnimationFrame(animationFrame);
      celebrateBirthday(current.element);
      return;
    }

    keepTowerInView();

    if (isPerfect) {
      showPerfectFit(current);
      return;
    }

    direction *= -1;
    spawnMovingBlock();
  }

  function createTrimmedPiece(current, overlapStart, overlapEnd) {
    let cutX = current.x;
    let cutWidth = overlapStart - current.x;

    if (current.x < overlapStart) {
      cutX = current.x;
      cutWidth = overlapStart - current.x;
    } else if (current.x + current.width > overlapEnd) {
      cutX = overlapEnd;
      cutWidth = current.x + current.width - overlapEnd;
    }

    if (cutWidth <= 0) {
      return;
    }

    const piece = current.element.cloneNode(true);
    piece.classList.remove("is-moving");
    piece.classList.add("is-trimmed");
    piece.style.width = `${cutWidth}px`;
    piece.style.transform = `translate3d(${cutX}px, ${current.y}px, 0)`;
    stackLayer.append(piece);

    requestAnimationFrame(() => {
      const fallDirection = cutX < overlapStart ? -1 : 1;
      piece.style.setProperty("--fall-x", `${cutX + fallDirection * 90}px`);
      piece.style.setProperty("--fall-y", `${current.y + 580}px`);
      piece.classList.add("is-falling");
    });

    piece.addEventListener("animationend", () => piece.remove(), { once: true });
  }

  function dropMissedBlock(block) {
    block.element.classList.remove("is-moving");
    block.element.classList.add("is-trimmed", "is-falling");
    block.element.style.setProperty("--fall-x", `${block.x + direction * 120}px`);
    block.element.style.setProperty("--fall-y", `${block.y + 580}px`);
  }

  function keepTowerInView() {
    const latest = tower[tower.length - 1];
    const safeTop = Math.max(105, board.clientHeight * 0.24);

    if (latest.y >= safeTop) {
      return;
    }

    const shift = BLOCK_HEIGHT;
    tower.forEach((block) => {
      block.y += shift;
      positionBlock(block);
    });
  }

  function showPerfectFit(current) {
    board.classList.remove("is-perfect");
    void board.offsetWidth;
    board.classList.add("is-perfect");

    window.clearTimeout(perfectPauseTimer);
    perfectPauseTimer = window.setTimeout(() => {
      const boardRect = board.getBoundingClientRect();
      const anchorY = boardRect.top + current.y + current.height / 2;
      const riseDistance = Math.max(60, anchorY * 0.65);
      perfectCallout.style.top = `${anchorY}px`;
      perfectCallout.style.setProperty("--rise", `${riseDistance}px`);

      perfectCallout.classList.remove("is-visible");
      void perfectCallout.offsetWidth;
      perfectCallout.classList.add("is-visible");

      window.clearTimeout(perfectTimer);
      perfectTimer = window.setTimeout(() => {
        perfectCallout.classList.remove("is-visible");
        direction *= -1;
        lastFrameTime = 0;
        spawnMovingBlock();
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(animate);
      }, 900);
    }, 180);
  }

  function fitArcText() {
    const textEl = document.querySelector(".cake-arc-text");
    const pathEl = document.getElementById("cakeTextArc");
    if (!textEl || !pathEl) {
      return;
    }

    const pathLength = pathEl.getTotalLength();
    const textLength = textEl.getComputedTextLength();
    if (textLength > pathLength * 0.92) {
      const currentSize = parseFloat(getComputedStyle(textEl).fontSize);
      textEl.style.fontSize = `${currentSize * (pathLength * 0.92 / textLength)}px`;
    }
  }

  function randomizeDecorations() {
    document.querySelectorAll(".sparkle, .heart-deco").forEach((el) => {
      const baseX = parseFloat(el.dataset.baseX);
      const baseY = parseFloat(el.dataset.baseY);
      const jitterX = el.classList.contains("heart-deco") ? 12 : 16;
      const jitterY = el.classList.contains("heart-deco") ? 10 : 12;
      const x = baseX + (Math.random() * 2 - 1) * jitterX;
      const y = baseY + (Math.random() * 2 - 1) * jitterY;
      const rotation = Math.random() * 40 - 20;
      el.setAttribute("transform", `translate(${x},${y}) rotate(${rotation})`);
    });
  }

  function celebrateBirthday(candleElement) {
    window.clearTimeout(flameTimer);
    flameTimer = window.setTimeout(() => {
      const flame = candleElement.querySelector(".candle-flame");
      if (flame) {
        flame.classList.add("is-lit");
      }
    }, 600);

    window.clearTimeout(confettiTimer);
    confettiTimer = window.setTimeout(() => {
      burstConfetti();
    }, 1200);

    window.clearTimeout(birthdayTimer);
    birthdayTimer = window.setTimeout(() => {
      randomizeDecorations();
      birthdayBanner.hidden = false;
      birthdayBanner.classList.remove("is-visible");
      void birthdayBanner.offsetWidth;
      birthdayBanner.classList.add("is-visible");
      requestAnimationFrame(fitArcText);
    }, 3800);
  }

  function burstConfetti() {
    if (prefersReducedMotion) {
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const origins = [
      { x: vw * 0.02, y: vh * 0.02 },
      { x: vw * 0.98, y: vh * 0.02 },
      { x: vw * 0.02, y: vh * 0.5 },
      { x: vw * 0.98, y: vh * 0.5 },
      { x: vw * 0.02, y: vh * 0.98 },
      { x: vw * 0.98, y: vh * 0.98 },
    ];

    origins.forEach((origin) => {
      jsConfetti.addConfettiAtPosition({
        confettiDispatchPosition: { x: origin.x, y: origin.y },
        emojis: ["🎁"],
        confettiNumber: 60,
      });
    });
  }

  function finishGame() {
    state = "over";
    cancelAnimationFrame(animationFrame);
    movingBlock = null;
    board.classList.remove("is-playing");
    board.classList.add("is-over");

    finalScoreElement.textContent = String(score);

    window.setTimeout(() => {
      gameOver.hidden = false;
      playAgainButton.focus({ preventScroll: true });
    }, 430);
  }

  function handleBoardAction(event) {
    const target = event.target;
    if (target?.closest("button")) {
      return;
    }
    if (state === "playing") {
      dropBlock();
    }
  }

  landingButton.addEventListener("click", () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    landing.classList.add("is-hidden");
    document.body.classList.add("game-revealed");
    window.setTimeout(() => {
      landing.hidden = true;
    }, 760);
  });

  startButton.addEventListener("click", resetGame);
  playAgainButton.addEventListener("click", resetGame);
  cardPlayAgainButton.addEventListener("click", resetGame);
  board.addEventListener("pointerdown", handleBoardAction);
  board.addEventListener("keydown", (event) => {
    if (!landing.hidden) {
      return;
    }
    if (event.code !== "Space" && event.code !== "Enter") {
      return;
    }
    event.preventDefault();
    if (state === "idle" || state === "over") {
      resetGame();
    } else {
      dropBlock();
    }
  });

  window.addEventListener("resize", () => {
    if (state === "playing") {
      resetGame();
    }
  });
