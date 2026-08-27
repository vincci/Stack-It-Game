export const TOTAL_STACKS = 15;
export const INITIAL_SECTIONS = 15;
export const POINTS_PER_SECTION = 10;
export const INITIAL_SCORE = INITIAL_SECTIONS * POINTS_PER_SECTION;
export const MAX_SCORE = TOTAL_STACKS * INITIAL_SCORE;

export function sectionsFromOverlap(overlapWidth, sectionWidth, availableSections) {
  if (
    !Number.isFinite(overlapWidth)
    || !Number.isFinite(sectionWidth)
    || sectionWidth <= 0
    || !Number.isInteger(availableSections)
    || availableSections < 1
    || overlapWidth <= 0
  ) {
    return 0;
  }

  return Math.min(
    availableSections,
    Math.max(0, Math.floor((overlapWidth + Number.EPSILON) / sectionWidth)),
  );
}

export function pointsForSections(sections) {
  return Number.isInteger(sections) && sections > 0
    ? sections * POINTS_PER_SECTION
    : 0;
}

export function scoreRun(survivingSections) {
  let score = INITIAL_SCORE;
  let stackCount = 1;
  let currentSections = INITIAL_SECTIONS;

  for (const sections of survivingSections.slice(0, TOTAL_STACKS - 1)) {
    if (!Number.isInteger(sections) || sections < 0 || sections > currentSections) {
      throw new RangeError("Each placement must preserve zero to all current sections.");
    }
    if (sections === 0) {
      break;
    }
    score += pointsForSections(sections);
    currentSections = sections;
    stackCount += 1;
  }

  return { score, stackCount, currentSections };
}
