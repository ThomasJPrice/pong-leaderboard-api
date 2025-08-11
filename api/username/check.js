import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: "Username parameter is required" });
  }

  try {
    // Get all usernames from the usernames hash
    const allUsernames = await redis.hgetall('usernames');
    
    // Check if the username is already taken (case-insensitive)
    const usernameLower = username.toLowerCase();
    const isTaken = Object.values(allUsernames || {}).some(
      existingUsername => existingUsername.toLowerCase() === usernameLower
    );

    return res.status(200).json({ available: !isTaken });
  } catch (error) {
    console.error('Error checking username availability:', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
