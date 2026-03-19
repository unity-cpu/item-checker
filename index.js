// api/index.js
import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// Load env vars (Vercel injects them automatically in production)
const TITLE_ID = process.env.PLAYFAB_TITLE_ID;
const SERVER_SECRET = process.env.PLAYFAB_SERVER_SECRET;
const WEBHOOK = process.env.DISCORD_WEBHOOK;

// Basic security: optional API key check (add API_KEY env var in Vercel)
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }
  next();
});

if (!TITLE_ID || !SERVER_SECRET || !WEBHOOK) {
  console.error('Missing required environment variables');
}

// PlayFab API helper
async function pfPost(endpoint, data) {
  const url = `https://${TITLE_ID}.playfabapi.com${endpoint}`;
  const response = await axios.post(url, data, {
    headers: {
      'X-Authentication': SERVER_SECRET,
      'Content-Type': 'application/json',
    },
  });

  if (response.data.code !== 200 || response.data.status !== 'OK') {
    throw new Error(`PlayFab error: ${response.data.errorMessage || JSON.stringify(response.data)}`);
  }

  return response.data.data;
}

// Discord webhook helper
async function sendDiscord(embed) {
  await axios.post(WEBHOOK, { embeds: [embed] }, {
    headers: { 'Content-Type': 'application/json' },
  });
}

app.post('/cos-check', async (req, res) => {
  const { playfabId: id } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'playfabId is required (string)' });
  }

  try {
    const flags = ["LBAAD.", "LBAAK.", "LBAAZ.", "COFOUNDER."];

    const whitelist = [
      "77907B0861DC3893",
      "A6BA00109B511CBE",
      "77419AE1A346F8A4",
      "7B9103D7123308A8",
      "E1D0BA327318DC30",
      "1A7D87490363DCBA",
      "B258E1BEB40B2706",
      "7C08652A633C6BF",
      "514C3D68AA4312D6",
      "AF544D61A83BE007",
      "527BB7D752B9EC6F",
      "FF4B696527AE4D9B",
      "E7DF087A7D57AA49",
      "CD5494E6C59ABD57",
      "19EAE8BB6533EF53",
      "6A3625D2297D14BB",
      "F71A8D5B23A6DEC6",
      "79E167578AF221A8",
      "2A4D748DEE715B68",
      "F32028A1A8FB9182",
      "4B1CEA274AC14467",
      "831794771F6021B0",
      "27AF5E2569BA4B30",
      "E82B0AE495164976",
      "C64F7F7C5B4CFE81",
      "711E159A66047286",
      "A1D1D3D39AD38B38",
      "CEF3083A3BE0F883",
      "8F574901C7CADDDD",
      "741AD258DF4F4C9E",
      "2EDE279017C3F386",
      "8F574901C7CADDDD",
      "607FD91075CCC0A8",
      "AF7347BD6C28F3D8",
      "741AD258DF4F4C9E",
      "E7DF087A7D57AA49",
    ];

    if (whitelist.includes(id)) {
      await sendDiscord({
        title: "COSMETICS AUTHORIZED",
        description: `A staff Member \`${id}\` Has joined the game.`,
        color: 65280, // green
        timestamp: new Date().toISOString(),
      });
      return res.json({ status: "authorized" });
    }

    // Get inventory
    const invData = await pfPost("/Server/GetUserInventory", { PlayFabId: id });
    const inventory = invData.Inventory || [];

    const violations = [];
    for (const item of inventory) {
      for (const flag of flags) {
        if (item.ItemId.includes(flag)) {
          violations.push({
            name: item.ItemId,
            instance: item.ItemInstanceId,
          });
        }
      }
    }

    if (violations.length === 0) {
      return res.json({ status: "clean" });
    }

    // Get IP from profile
    const profileData = await pfPost("/Server/GetPlayerProfile", {
      PlayFabId: id,
      ProfileConstraints: { ShowLastLogin: true },
    });
    const ip = profileData.PlayerProfile?.LastLoginAddress ?? "unknown";

    // Revoke bad items
    for (const violation of violations) {
      await pfPost("/Server/RevokeInventoryItem", {
        PlayFabId: id,
        ItemInstanceId: violation.instance,
      });
    }

    // Ban player + IP
    await pfPost("/Server/BanUsers", {
      Bans: [{
        PlayFabId: id,
        IPAddress: ip,
        Reason: "UNAUTHORIZED ASSET POSSESSION",
        DurationInHours: 175200, // ~20 years
      }],
    });

    // Discord alert
    await sendDiscord({
      title: "UNAUTHORIZED COSMETICS",
      color: 16711680, // red
      fields: [
        { name: "PlayFab ID", value: `\`${id}\``, inline: true },
        { name: "Network IP", value: `\`${ip}\``, inline: true },
        { name: "Violations", value: violations.map(v => v.name).join(", ") },
      ],
      footer: { text: "Made by Sunday" },
      timestamp: new Date().toISOString(),
    });

    return res.json({ status: "terminated" });

  } catch (error) {
    console.error('Error in /cos-check:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message, // remove in production if sensitive
    });
  }
});

// Export for Vercel serverless
export default app;
