function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function onRequest(context) {
  if (context.request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!context.env.DB) {
    return json({ error: "Leaderboard unavailable" }, 503);
  }

  try {
    const result = await context.env.DB.prepare(`
      SELECT
        ROW_NUMBER() OVER (
          ORDER BY score DESC, created_at ASC, id ASC
        ) AS rank,
        name,
        score
      FROM scores
      ORDER BY score DESC, created_at ASC, id ASC
      LIMIT 10
    `).all();
    return json({ scores: result.results ?? [] });
  } catch (error) {
    console.error("Unable to load leaderboard", error);
    return json({ error: "Leaderboard unavailable" }, 503);
  }
}
