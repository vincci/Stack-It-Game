import test from "node:test";
import assert from "node:assert/strict";

import {
  INITIAL_SCORE,
  INITIAL_SECTIONS,
  MAX_SCORE,
  TOTAL_STACKS,
  pointsForSections,
  scoreRun,
  sectionsFromOverlap,
} from "../game-rules.js";

const SECTION_WIDTH = 16;

test("the base starts with 15 sections and 150 points", () => {
  assert.equal(INITIAL_SECTIONS, 15);
  assert.equal(INITIAL_SCORE, 150);
  assert.deepEqual(scoreRun([]), {
    score: 150,
    stackCount: 1,
    currentSections: 15,
  });
});

test("perfect and partial overlaps award ten points per surviving section", () => {
  assert.equal(sectionsFromOverlap(15 * SECTION_WIDTH, SECTION_WIDTH, 15), 15);
  assert.equal(pointsForSections(15), 150);
  assert.equal(sectionsFromOverlap(10 * SECTION_WIDTH, SECTION_WIDTH, 15), 10);
  assert.equal(pointsForSections(10), 100);
  assert.equal(sectionsFromOverlap(5 * SECTION_WIDTH, SECTION_WIDTH, 10), 5);
  assert.equal(pointsForSections(5), 50);
});

test("the next placement cannot regain discarded sections", () => {
  assert.equal(sectionsFromOverlap(15 * SECTION_WIDTH, SECTION_WIDTH, 10), 10);
  assert.deepEqual(scoreRun([10, 8, 8, 5]), {
    score: 460,
    stackCount: 5,
    currentSections: 5,
  });
});

test("zero overlap ends the run without adding points", () => {
  assert.deepEqual(scoreRun([10, 0, 5]), {
    score: 250,
    stackCount: 2,
    currentSections: 10,
  });
});

test("fourteen perfect drops complete stack 15 at exactly 2250", () => {
  const result = scoreRun(Array(TOTAL_STACKS - 1).fill(INITIAL_SECTIONS));
  assert.equal(MAX_SCORE, 2250);
  assert.deepEqual(result, {
    score: 2250,
    stackCount: 15,
    currentSections: 15,
  });
});

test("a sixteenth placement is never counted", () => {
  const result = scoreRun(Array(TOTAL_STACKS).fill(INITIAL_SECTIONS));
  assert.deepEqual(result, {
    score: 2250,
    stackCount: 15,
    currentSections: 15,
  });
});
