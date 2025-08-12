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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ 
      success: false, 
      error: "username is required" 
    });
  }

  // Basic username validation
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ 
      success: false, 
      error: "Username must be between 3 and 20 characters" 
    });
  }

  // Check for valid characters (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json({ 
      success: false, 
      error: "Username can only contain letters, numbers, and underscores" 
    });
  }

  try {
    // Get all usernames from the usernames hash
    const allUsernames = await redis.hgetall('usernames');
    
    // Check if the username is already taken by another user (case-insensitive)
    const usernameLower = username.toLowerCase();
    const existingUserWithUsername = Object.entries(allUsernames || {}).find(
      ([userId, existingUsername]) => 
        userId !== user_id && existingUsername.toLowerCase() === usernameLower
    );

    if (existingUserWithUsername) {
      return res.status(409).json({ 
        success: false, 
        error: "Username is already taken" 
      });
    }

    // Set the username for the user
    await redis.hset('usernames', { [user_id]: username });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error setting username:', error);
    return res.status(500).json({ 
      success: false, 
      error: "Internal server error" 
    });
  }
}
