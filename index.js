// index.js
import express from 'express';
import { checkCosmetics } from './playfab.js';

const app = express();
app.use(express.json());

// Load env vars (Vercel injects them automatically in production)
const API_KEY = process.env.API_KEY;

// Basic security: optional API key check (add API_KEY env var in Vercel)
app.use((req, res, next) => {
  if (API_KEY) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    }
  }
  next();
});

app.post('/cos-check', async (req, res) => {
  const { playfabId } = req.body;

  if (!playfabId || typeof playfabId !== 'string') {
    return res.status(400).json({ error: 'playfabId is required (string)' });
  }

  try {
    const result = await checkCosmetics(playfabId);
    return res.json(result);
  } catch (error) {
    console.error('Error in /cos-check:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'PlayFab Cosmetics Checker' });
});

// Export for Vercel serverless
export default app;
