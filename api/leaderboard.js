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

  if (req.method === 'GET') {
    const limit = parseInt(req.query.limit || '10', 10);
    const data = await redis.zrevrange('leaderboard', 0, limit - 1, { withScores: true });

    const leaderboard = [];
    for (let i = 0; i < data.length; i += 2) {
      const user_id = data[i];
      const score = Number(data[i + 1]);
      const username = await redis.hget('usernames', user_id);
      leaderboard.push({ username, score });
    }

    return res.status(200).json(leaderboard);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
