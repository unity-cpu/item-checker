import express from 'express';
import dotenv from 'dotenv';
import { checkCosmetics } from './playfab.js';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const WEBHOOK = process.env.DISCORD_WEBHOOK;

if (!WEBHOOK) {
  console.error("DISCORD_WEBHOOK missing in .env");
  process.exit(1);
}

app.post('/cos-check', async (req, res) => {
  const { playfabId } = req.body;

  if (!playfabId) {
    return res.status(400).json({ error: "playfabId required" });
  }

  try {
    const result = await checkCosmetics(playfabId, WEBHOOK);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`COS checker running on port ${PORT}`);
});
