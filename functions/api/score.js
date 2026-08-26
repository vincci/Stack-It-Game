const MAX_NAME_LENGTH = 12;
const MAX_SCORE = 13;
const NAME_PATTERN = /^[\p{L}\p{N} .'-]+$/u;

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validateName(value) {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim();
  if (
    !name
    || Array.from(name).length > MAX_NAME_LENGTH
    || !NAME_PATTERN.test(name)
    || !/[\p{L}\p{N}]/u.test(name)
  ) {
    return null;
  }
  return name;
}

export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!context.env.DB) {
    return json({ error: "Score service unavailable" }, 503);
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const name = validateName(payload?.name);
  const score = payload?.score;
  if (!name) {
    return json({ error: "Invalid name" }, 400);
  }
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return json({ error: "Invalid score" }, 400);
  }

  try {
    const result = await context.env.DB.prepare(
      "INSERT INTO scores (name, score) VALUES (?, ?)"
    ).bind(name, score).run();
    const insertedId = result.meta?.last_row_id;
    const entry = await context.env.DB.prepare(`
      SELECT rank, name, score
      FROM (
        SELECT
          id,
          name,
          score,
          ROW_NUMBER() OVER (
            ORDER BY score DESC, created_at ASC, id ASC
          ) AS rank
        FROM scores
      )
      WHERE id = ?
    `).bind(insertedId).first();

    if (!entry) {
      throw new Error("Inserted score could not be ranked");
    }
    return json({ entry }, 201);
  } catch (error) {
    console.error("Unable to save score", error);
    return json({ error: "Score service unavailable" }, 503);
  }
}
