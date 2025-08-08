import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { user_id, username, score } = req.body;

    // Save username
    await redis.hset('usernames', { [user_id]: username });

    // Get current score
    const current = await redis.zscore('leaderboard', user_id);
    if (!current || score > current) {
      await redis.zadd('leaderboard', { score, member: user_id });
    }

    return res.status(200).json({ success: true });
  }

  if (req.method === "GET") {
    const data = await redis.zrange("leaderboard", 0, 9, {
      rev: true, // reverse order (highest score first)
      withScores: true, // include scores
    });

    res.status(200).json(data);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
