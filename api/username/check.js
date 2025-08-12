import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  // TEMP: Log incoming headers for debugging
  console.log('Incoming headers:', req.headers);

  // User ID check (must be present in every request)
  const user_id = req.method === 'GET'
    ? (req.query?.user_id || req.body?.user_id)
    : req.body?.user_id;

  if (!user_id) {
    return res.status(401).json({ error: 'Unauthorized: user_id required' });
  }

  // Check if user_id exists in usernames table
  const usernameExists = await redis.hget('usernames', user_id);
  if (!usernameExists) {
    return res.status(401).json({ error: 'Unauthorized: user_id not found' });
  }

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
