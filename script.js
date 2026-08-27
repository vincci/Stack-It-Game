import {
  INITIAL_SCORE,
  INITIAL_SECTIONS,
  MAX_SCORE,
  TOTAL_STACKS,
  pointsForSections,
  sectionsFromOverlap,
} from "./game-rules.js";

  const BLOCK_HEIGHT = 34;
  const BASE_WIDTH = 240;
  const SECTION_WIDTH = BASE_WIDTH / INITIAL_SECTIONS;
  const PERFECT_MARGIN = 5;
  const START_SPEED = 190;
  const MAX_SPEED = 420;
  const SPEED_GROWTH = 1.15;
  const MAX_NAME_LENGTH = 12;

  const board = requireElement("gameBoard");
  const stackLayer = requireElement("stackLayer");
  const startScreen = requireElement("startScreen");
  const startButton = requireElement("startButton");
  const gameOver = requireElement("gameOver");
  const playAgainButton = requireElement("playAgainButton");
  const finalScoreElement = requireElement("finalScore");
  const yourScoreElement = requireElement("yourScore");
  const scoreEntryPanel = requireElement("scoreEntryPanel");
  const resultChoicePanel = requireElement("resultChoicePanel");
  const chooseSubmitButton = requireElement("chooseSubmitButton");
  const resultPlayAgainButton = requireElement("resultPlayAgainButton");
  const leaderboardPanel = requireElement("leaderboardPanel");
  const leaderboardList = requireElement("leaderboardList");
  const leaderboardEmpty = requireElement("leaderboardEmpty");
  const scoreForm = requireElement("scoreForm");
  const playerNameInput = requireElement("playerName");
  const nameError = requireElement("nameError");
  const submitError = requireElement("submitError");
  const submitScoreButton = requireElement("submitScoreButton");
  const perfectCallout = requireElement("perfectCallout");
  const faceCelebration = requireElement("faceCelebration");
  const landing = requireElement("landing");
  const landingButton = requireElement("landingButton");

  const tones = ["tomato", "mustard", "mint", "sky", "lilac", "cream"];
  const FACE_PARTICLE_COUNT = 30;
  const FACE_CELEBRATION_DURATION = 1800;
  const FACE_ASSETS = Array.from(
    { length: 8 },
    (_, index) => `./assets/darren-faces/face-${index + 1}.webp`,
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const faceParticles = [];

  let state = "idle";
  let tower = [];
  let movingBlock = null;
  let score = INITIAL_SCORE;
  let stackCount = 1;
  let currentSections = INITIAL_SECTIONS;
  let direction = 1;
  let speed = START_SPEED;
  let lastFrameTime = 0;
  let animationFrame = 0;
  let perfectTimer = 0;
  let perfectPauseTimer = 0;
  let completionTimer = 0;
  let scoreSubmissionInFlight = false;
  let submittedEntry = null;

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

  function createBlock(
    x,
    y,
    width,
    tone,
    className = "tower-block",
    height = BLOCK_HEIGHT,
    sections = Math.max(1, Math.round(width / SECTION_WIDTH)),
  ) {
    const element = document.createElement("div");
    element.className = className;
    element.dataset.tone = tone;
    element.dataset.sections = String(sections);
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    element.style.setProperty("--bx", `${x}px`);
    element.style.setProperty("--by", `${y}px`);

    const studs = document.createElement("span");
    studs.className = "block-studs";
    const studCount = Math.max(1, Math.floor(width / 44));
    for (let index = 0; index < studCount; index += 1) {
      studs.append(document.createElement("i"));
    }

    element.append(studs);
    stackLayer.append(element);

    return { element, x, y, width, height, sections };
  }

  function positionBlock(block) {
    block.element.style.width = `${block.width}px`;
    block.element.style.setProperty("--bx", `${block.x}px`);
    block.element.style.setProperty("--by", `${block.y}px`);
  }

  function syncGameState() {
    board.dataset.score = String(score);
    board.dataset.stackCount = String(stackCount);
    board.dataset.currentSections = String(currentSections);
  }

  function resetGame() {
    cancelAnimationFrame(animationFrame);
    window.clearTimeout(perfectTimer);
    window.clearTimeout(perfectPauseTimer);
    window.clearTimeout(completionTimer);

    state = "playing";
    score = INITIAL_SCORE;
    stackCount = 1;
    currentSections = INITIAL_SECTIONS;
    speed = START_SPEED;
    direction = Math.random() > 0.5 ? 1 : -1;
    lastFrameTime = 0;
    movingBlock = null;
    tower = [];
    submittedEntry = null;
    syncGameState();

    gameOver.hidden = true;
    startScreen.hidden = true;
    perfectCallout.classList.remove("is-visible");
    clearFaceCelebration();
    resetScoreOverlay();
    stackLayer.replaceChildren();
    board.classList.remove("is-over", "is-perfect", "is-complete");
    board.classList.add("is-playing");

    const size = boardSize();
    const baseY = size.height - BLOCK_HEIGHT - 34;
    const baseX = (size.width - BASE_WIDTH) / 2;
    const base = createBlock(
      baseX,
      baseY,
      BASE_WIDTH,
      "cream",
      "tower-block is-base",
      BLOCK_HEIGHT,
      INITIAL_SECTIONS,
    );

    tower.push(base);
    spawnMovingBlock();
    board.focus({ preventScroll: true });
    animationFrame = requestAnimationFrame(animate);
  }

  function spawnMovingBlock() {
    const previous = tower[tower.length - 1];
    const size = boardSize();
    const width = currentSections * SECTION_WIDTH;
    const y = previous.y - BLOCK_HEIGHT;
    const entersFromLeft = direction > 0;
    const x = entersFromLeft ? -width : size.width;
    const tone = tones[(stackCount - 1) % tones.length];

    movingBlock = createBlock(
      x,
      y,
      width,
      tone,
      "tower-block is-moving",
      BLOCK_HEIGHT,
      currentSections,
    );
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

    if (rawOverlap <= 0) {
      dropMissedBlock(current);
      finishGame("miss");
      return;
    }

    const offset = current.x - previous.x;
    const isPerfect = Math.abs(offset) <= PERFECT_MARGIN;
    let overlapSections;
    let overlap;

    if (isPerfect) {
      overlapStart = previous.x;
      overlapEnd = previousRight;
      overlap = previous.width;
      overlapSections = currentSections;
    } else {
      overlapSections = sectionsFromOverlap(rawOverlap, SECTION_WIDTH, currentSections);
      if (overlapSections === 0) {
        dropMissedBlock(current);
        finishGame("miss");
        return;
      }

      overlap = overlapSections * SECTION_WIDTH;
      if (current.x < previous.x) {
        overlapStart = overlapEnd - overlap;
      } else {
        overlapEnd = overlapStart + overlap;
      }
      createTrimmedPiece(current, overlapStart, overlapEnd);
    }

    current.x = overlapStart;
    current.width = overlap;
    current.sections = overlapSections;
    current.element.dataset.sections = String(overlapSections);
    current.element.classList.remove("is-moving");
    current.element.classList.add("is-placed");
    positionBlock(current);

    previous.element.classList.remove("is-squashed");
    void previous.element.offsetWidth;
    previous.element.classList.add("is-squashed");

    tower.push(current);
    movingBlock = null;
    score += pointsForSections(overlapSections);
    currentSections = overlapSections;
    stackCount += 1;
    if (score > MAX_SCORE) {
      throw new Error("Score exceeded the configured maximum.");
    }
    syncGameState();
    speed = Math.min(MAX_SPEED, speed * SPEED_GROWTH);

    if (stackCount >= TOTAL_STACKS) {
      state = "complete";
      board.classList.remove("is-playing");
      board.classList.add("is-complete");
      cancelAnimationFrame(animationFrame);
      celebrateCompletion();
      completionTimer = window.setTimeout(
        () => finishGame("complete", 0),
        reducedMotion.matches ? 650 : FACE_CELEBRATION_DURATION,
      );
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

  function createFaceParticles() {
    if (faceParticles.length) {
      return;
    }

    const fragment = document.createDocumentFragment();
    for (let index = 0; index < FACE_PARTICLE_COUNT; index += 1) {
      const particle = document.createElement("img");
      particle.className = "face-particle";
      particle.alt = "";
      particle.decoding = "async";
      particle.draggable = false;
      faceParticles.push(particle);
      fragment.append(particle);
    }
    faceCelebration.append(fragment);
  }

  function clearFaceCelebration() {
    faceCelebration.hidden = true;
    faceCelebration.classList.remove("is-visible", "is-reduced");
    faceParticles.forEach((particle) => particle.classList.remove("is-active"));
  }

  function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
  }

  function celebrateCompletion() {
    createFaceParticles();
    clearFaceCelebration();

    const size = boardSize();
    const isReduced = reducedMotion.matches;
    const particleCount = isReduced ? 0 : FACE_PARTICLE_COUNT;
    const origins = [
      { x: size.width * 0.02, y: size.height * 0.02, angle: [20, 70] },
      { x: size.width * 0.98, y: size.height * 0.02, angle: [110, 160] },
      { x: size.width * 0.02, y: size.height * 0.5, angle: [-35, 35] },
      { x: size.width * 0.98, y: size.height * 0.5, angle: [145, 215] },
      { x: size.width * 0.02, y: size.height * 0.98, angle: [-70, -20] },
      { x: size.width * 0.98, y: size.height * 0.98, angle: [-160, -110] },
    ];

    faceParticles.forEach((particle, index) => {
      if (index >= particleCount) {
        return;
      }

      const origin = origins[index % origins.length];
      const originParticleIndex = Math.floor(index / origins.length);
      const particlesPerOrigin = Math.ceil(particleCount / origins.length);
      const angleProgress = (originParticleIndex + randomBetween(0.12, 0.88)) / particlesPerOrigin;
      const angle = (
        origin.angle[0] + (origin.angle[1] - origin.angle[0]) * angleProgress
      ) * (Math.PI / 180);
      const launchDistance = randomBetween(size.width * 0.24, size.width * 0.42);
      const launchX = Math.cos(angle) * launchDistance;
      const launchY = Math.sin(angle) * launchDistance;
      const gravityY = randomBetween(size.height * 0.26, size.height * 0.5);
      const startRotation = randomBetween(-25, 25);
      const endRotation = startRotation + randomBetween(-80, 80);
      const faceSize = randomBetween(54 * 1.2, Math.min(114, size.width * 0.21) * 1.2);

      particle.src = FACE_ASSETS[Math.floor(Math.random() * FACE_ASSETS.length)];
      particle.style.setProperty("--face-x", `${origin.x + randomBetween(-18, 18)}px`);
      particle.style.setProperty("--face-y", `${origin.y + randomBetween(-18, 18)}px`);
      particle.style.setProperty("--face-size", `${faceSize}px`);
      particle.style.setProperty("--face-mid-x", `${launchX * 0.55}px`);
      particle.style.setProperty("--face-mid-y", `${launchY * 0.55}px`);
      particle.style.setProperty("--face-late-x", `${launchX * 0.86}px`);
      particle.style.setProperty("--face-late-y", `${launchY * 0.86 + gravityY * 0.45}px`);
      particle.style.setProperty("--face-end-x", `${launchX * 1.08}px`);
      particle.style.setProperty("--face-end-y", `${launchY * 1.08 + gravityY}px`);
      particle.style.setProperty("--face-start-rotation", `${startRotation}deg`);
      particle.style.setProperty("--face-end-rotation", `${endRotation}deg`);
      particle.style.setProperty("--face-scale", String(randomBetween(0.5, 1.2)));
      particle.style.setProperty("--face-delay", `${isReduced ? 0 : randomBetween(0, 160)}ms`);
      particle.style.setProperty("--face-duration", `${randomBetween(1180, 1370)}ms`);
      particle.classList.add("is-active");
    });

    faceCelebration.hidden = false;
    void faceCelebration.offsetWidth;
    faceCelebration.classList.add("is-visible");
    if (isReduced) {
      faceCelebration.classList.add("is-reduced");
    }
  }

  function resetScoreOverlay() {
    scoreSubmissionInFlight = false;
    scoreEntryPanel.hidden = false;
    resultChoicePanel.hidden = false;
    scoreForm.hidden = true;
    leaderboardPanel.hidden = true;
    scoreForm.reset();
    nameError.hidden = true;
    nameError.textContent = "";
    submitError.hidden = true;
    submitScoreButton.disabled = false;
    submitScoreButton.textContent = "Submit score";
    leaderboardList.replaceChildren();
    leaderboardEmpty.hidden = true;
    gameOver.setAttribute("aria-labelledby", "gameOverTitle");
  }

  function showNameEntry() {
    resultChoicePanel.hidden = true;
    scoreForm.hidden = false;
    gameOver.setAttribute("aria-labelledby", "nameEntryTitle");
    requestAnimationFrame(() => {
      playerNameInput.focus({ preventScroll: true });
    });
  }

  function validatePlayerName(value) {
    const name = value.trim();
    if (!name) {
      return { valid: false, message: "Please enter your name." };
    }
    if (Array.from(name).length > MAX_NAME_LENGTH) {
      return { valid: false, message: "Keep your name to 12 characters." };
    }
    if (!/^[\p{L}\p{N} .'-]+$/u.test(name) || !/[\p{L}\p{N}]/u.test(name)) {
      return { valid: false, message: "Use letters, numbers, spaces, dots, - or '." };
    }
    return { valid: true, name };
  }

  function setSubmissionState(isSaving) {
    scoreSubmissionInFlight = isSaving;
    submitScoreButton.disabled = isSaving;
    submitScoreButton.textContent = isSaving ? "Saving..." : "Submit score";
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  async function fetchLeaderboard() {
    const response = await fetch("/api/leaderboard", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await readJson(response);
    if (!response.ok || !Array.isArray(body.scores)) {
      throw new Error("Leaderboard unavailable");
    }
    return body.scores;
  }

  function renderLeaderboard(scores) {
    leaderboardList.replaceChildren();
    const safeScores = scores.filter((entry) => (
      Number.isInteger(entry?.rank)
      && typeof entry?.name === "string"
      && Number.isInteger(entry?.score)
    )).slice(0, 10);

    safeScores.forEach((entry) => {
      const row = document.createElement("li");
      row.className = "leaderboard-row";
      const isYou = submittedEntry
        && entry.rank === submittedEntry.rank
        && entry.name === submittedEntry.name
        && entry.score === submittedEntry.score;
      if (isYou) {
        row.classList.add("is-you");
        row.setAttribute("aria-current", "true");
      }

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = String(entry.rank).padStart(2, "0");

      const name = document.createElement("span");
      name.className = "leaderboard-name";
      name.textContent = entry.name;
      if (isYou) {
        const you = document.createElement("span");
        you.className = "leaderboard-you";
        you.textContent = "YOU";
        name.append(you);
      }

      const points = document.createElement("span");
      points.className = "leaderboard-points";
      points.textContent = String(entry.score);
      row.append(rank, name, points);
      leaderboardList.append(row);
    });

    leaderboardEmpty.hidden = safeScores.length !== 0;
    yourScoreElement.textContent = String(score);
    scoreEntryPanel.hidden = true;
    leaderboardPanel.hidden = false;
    gameOver.setAttribute("aria-labelledby", "leaderboardTitle");
    playAgainButton.focus({ preventScroll: true });
  }

  async function submitScore(event) {
    event.preventDefault();
    if (scoreSubmissionInFlight) {
      return;
    }

    const validation = validatePlayerName(playerNameInput.value);
    if (!validation.valid) {
      nameError.textContent = validation.message;
      nameError.hidden = false;
      playerNameInput.focus({ preventScroll: true });
      return;
    }

    nameError.hidden = true;
    submitError.hidden = true;
    setSubmissionState(true);

    try {
      if (!submittedEntry) {
        const response = await fetch("/api/score", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: validation.name, score }),
        });
        const body = await readJson(response);
        if (!response.ok || !body.entry) {
          throw new Error("Score unavailable");
        }
        submittedEntry = body.entry;
      }

      const scores = await fetchLeaderboard();
      renderLeaderboard(scores);
    } catch {
      submitError.hidden = false;
      setSubmissionState(false);
      submitScoreButton.focus({ preventScroll: true });
    }
  }

  function finishGame(result, revealDelay = 430) {
    state = "over";
    cancelAnimationFrame(animationFrame);
    movingBlock = null;
    board.classList.remove("is-playing");
    board.classList.add("is-over");
    finalScoreElement.textContent = String(score);
    yourScoreElement.textContent = String(score);
    resetScoreOverlay();

    window.setTimeout(() => {
      if (result === "complete") {
        clearFaceCelebration();
      }
      gameOver.hidden = false;
      chooseSubmitButton.focus({ preventScroll: true });
    }, revealDelay);
  }

  function handleBoardAction(event) {
    const target = event.target;
    if (target?.closest("button, input, form")) {
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
  resultPlayAgainButton.addEventListener("click", resetGame);
  chooseSubmitButton.addEventListener("click", showNameEntry);
  scoreForm.addEventListener("submit", submitScore);
  playerNameInput.addEventListener("input", () => {
    nameError.hidden = true;
    submitError.hidden = true;
  });
  playerNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      scoreForm.requestSubmit();
    }
  });
  board.addEventListener("pointerdown", handleBoardAction);
  board.addEventListener("keydown", (event) => {
    if (event.target?.closest("button, input, form")) {
      return;
    }
    if (!landing.hidden) {
      return;
    }
    if (event.code !== "Space" && event.code !== "Enter") {
      return;
    }
    event.preventDefault();
    if (state === "idle") {
      resetGame();
    } else if (state === "playing") {
      dropBlock();
    }
  });

  window.addEventListener("resize", () => {
    if (state === "playing") {
      resetGame();
    }
  });
