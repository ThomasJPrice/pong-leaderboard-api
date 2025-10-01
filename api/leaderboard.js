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
    // For GET requests, check query parameters first, then body
    const user_id = req.query?.user_id || req.body?.user_id;

    // Get top 10 scores with user IDs
    const topScores = await redis.zrange("leaderboard", 0, 99, {
      rev: true, // reverse order (highest score first)
      withScores: true, // include scores
    });

    // Get all usernames for the top 10 users
    const topUserIds = topScores.filter((_, index) => index % 2 === 0); // Extract user IDs (every even index)
    const usernamesObj = topUserIds.length > 0 ? await redis.hmget('usernames', ...topUserIds) : {};

    // Build the top array with user_id, username, and score
    const top = [];
    for (let i = 0; i < topScores.length; i += 2) {
      const userId = topScores[i];
      const score = topScores[i + 1];
      const username = usernamesObj[userId]; // Access username by userId key
      
      top.push({
        user_id: userId,
        username: username || 'Unknown',
        score: score
      });
    }

    // Handle user-specific data only if user_id is provided
    let userScore = 0;
    let inTop = false;
    let userPosition = null;
    
    if (user_id) {
      // Get the user's score
      userScore = await redis.zscore('leaderboard', user_id) || 0;
      
      // Check if user is in top 10
      inTop = topUserIds.includes(user_id);
      
      // Get user's position in the leaderboard (1-based ranking)
      if (userScore > 0) {
        userPosition = await redis.zrevrank('leaderboard', user_id);
        if (userPosition !== null) {
          userPosition = userPosition + 1; // Convert to 1-based ranking
        }
      }
    }

    const response = {
      top: top,
      score: userScore,
      inTop: inTop,
      position: userPosition
    };

    res.status(200).json(response);
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
