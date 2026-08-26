import assert from "node:assert/strict";
import test from "node:test";

import { onRequest as getLeaderboard } from "../functions/api/leaderboard.js";
import { onRequest as postScore } from "../functions/api/score.js";

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.database.fail) {
      throw new Error("Database unavailable");
    }
    assert.match(this.sql, /INSERT INTO scores/);
    const [name, score] = this.values;
    const id = this.database.rows.length + 1;
    this.database.rows.push({
      id,
      name,
      score,
      created_at: this.database.timestamps.shift() ?? `2026-08-26T00:00:${String(id).padStart(2, "0")}.000Z`,
    });
    return { meta: { last_row_id: id } };
  }

  async first() {
    if (this.database.fail) {
      throw new Error("Database unavailable");
    }
    const [id] = this.values;
    const rows = this.database.rankedRows();
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) {
      return null;
    }
    const { name, score } = rows[index];
    return { rank: index + 1, name, score };
  }

  async all() {
    if (this.database.fail) {
      throw new Error("Database unavailable");
    }
    return {
      results: this.database.rankedRows().slice(0, 10).map(({ name, score }, index) => ({
        rank: index + 1,
        name,
        score,
      })),
    };
  }
}

class FakeD1 {
  constructor({ fail = false, timestamps = [] } = {}) {
    this.fail = fail;
    this.rows = [];
    this.timestamps = [...timestamps];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  rankedRows() {
    return [...this.rows].sort((a, b) => (
      b.score - a.score
      || a.created_at.localeCompare(b.created_at)
      || a.id - b.id
    ));
  }
}

function scoreRequest(body, database = new FakeD1(), method = "POST") {
  const request = new Request("https://example.test/api/score", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? body : undefined,
  });
  return { context: { request, env: { DB: database } }, database };
}

async function submit(database, name, score) {
  const { context } = scoreRequest(JSON.stringify({ name, score }), database);
  return postScore(context);
}

async function withSuppressedConsoleError(callback) {
  const original = console.error;
  console.error = () => {};
  try {
    return await callback();
  } finally {
    console.error = original;
  }
}

test("POST /api/score accepts a valid payload and trims the name", async () => {
  const database = new FakeD1();
  const response = await submit(database, "  Vincent  ", 13);
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { entry: { rank: 1, name: "Vincent", score: 13 } });
  assert.deepEqual(database.rows[0].name, "Vincent");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("POST /api/score accepts letters, numbers, spaces, apostrophes, dots and hyphens", async () => {
  const database = new FakeD1();
  for (const name of ["Anne-Marie", "O'Brien", "Player 2", "V. Lee"]) {
    const response = await submit(database, name, 3);
    assert.equal(response.status, 201, name);
  }
});

test("POST /api/score rejects invalid names", async () => {
  const invalidNames = ["", "   ", "1234567890123", "🎂", "Name\u0000"];
  for (const name of invalidNames) {
    const response = await submit(new FakeD1(), name, 3);
    assert.equal(response.status, 400, JSON.stringify(name));
  }
});

test("POST /api/score rejects invalid scores", async () => {
  for (const score of [-1, 1.5, 14, 999999, "3", null]) {
    const response = await submit(new FakeD1(), "Vincent", score);
    assert.equal(response.status, 400, String(score));
  }
});

test("POST /api/score rejects malformed JSON", async () => {
  const { context } = scoreRequest("{not-json");
  const response = await postScore(context);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid JSON" });
});

test("POST /api/score returns a friendly error when D1 is unavailable", async () => {
  const response = await withSuppressedConsoleError(() => (
    submit(new FakeD1({ fail: true }), "Vincent", 3)
  ));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Score service unavailable" });
});

test("POST /api/score rejects unsupported methods", async () => {
  const { context } = scoreRequest(undefined, new FakeD1(), "GET");
  const response = await postScore(context);
  assert.equal(response.status, 405);
});

test("GET /api/leaderboard returns top 10 in score and submission order", async () => {
  const database = new FakeD1({
    timestamps: [
      "2026-08-26T00:00:03.000Z",
      "2026-08-26T00:00:01.000Z",
      "2026-08-26T00:00:02.000Z",
      "2026-08-26T00:00:04.000Z",
    ],
  });
  await submit(database, "Thirty", 13);
  await submit(database, "First 12", 12);
  await submit(database, "Second 12", 12);
  await submit(database, "Eleven", 11);

  const response = await getLeaderboard({
    request: new Request("https://example.test/api/leaderboard"),
    env: { DB: database },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual((await response.json()).scores, [
    { rank: 1, name: "Thirty", score: 13 },
    { rank: 2, name: "First 12", score: 12 },
    { rank: 3, name: "Second 12", score: 12 },
    { rank: 4, name: "Eleven", score: 11 },
  ]);
});

test("GET /api/leaderboard returns only public leaderboard fields", async () => {
  const database = new FakeD1();
  await submit(database, "Vincent", 8);
  const response = await getLeaderboard({
    request: new Request("https://example.test/api/leaderboard"),
    env: { DB: database },
  });
  const [entry] = (await response.json()).scores;
  assert.deepEqual(Object.keys(entry), ["rank", "name", "score"]);
});

test("GET /api/leaderboard returns a friendly error when D1 is unavailable", async () => {
  const response = await withSuppressedConsoleError(() => getLeaderboard({
    request: new Request("https://example.test/api/leaderboard"),
    env: { DB: new FakeD1({ fail: true }) },
  }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Leaderboard unavailable" });
});
