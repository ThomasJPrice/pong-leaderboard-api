import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { user_id, username } = req.body;

  if (!user_id || !username) {
    return res.status(400).json({ 
      success: false, 
      error: "user_id and username are required" 
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
