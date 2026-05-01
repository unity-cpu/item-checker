import axios from 'axios';

const TITLE_ID = process.env.PLAYFAB_TITLE_ID;
const SERVER_SECRET = process.env.PLAYFAB_SERVER_SECRET;
const WEBHOOK = process.env.DISCORD_WEBHOOK;

if (!TITLE_ID || !SERVER_SECRET) {
  throw new Error("Missing PlayFab TITLE_ID or SERVER_SECRET in environment variables");
}

const PLAYFAB_API = `https://${TITLE_ID}.playfabapi.com`;

async function pfPost(endpoint, data) {
  const resp = await axios.post(
    `${PLAYFAB_API}${endpoint}`,
    data,
    {
      headers: {
        'X-Authentication': SERVER_SECRET,
        'Content-Type': 'application/json',
      },
    }
  );
  if (resp.data.code !== 200 || resp.data.status !== 'OK') {
    throw new Error(`PlayFab error: ${resp.data.errorMessage || JSON.stringify(resp.data)}`);
  }
  return resp.data.data;
}

async function sendDiscord(embed) {
  if (!WEBHOOK) {
    console.warn('Discord webhook not configured');
    return;
  }
  await axios.post(WEBHOOK, { embeds: [embed] });
}

export async function checkCosmetics(id) {
  const flags = ["LBAAD.", "LBAAK.", "LBAAZ.", "COFOUNDER.", "FORESTGUIDE.", "MILK.", "TECHNO."];

const whitelist = [
  "6F4FBE2BCA16068A",
  "B80667DDCD44DC17",
  "BF29B79A2B400090",
  "DB8E46A11F243DD3",
  "DD84C718E8AFD777",
  "35764A5E18580CF",
  "B716F79A9FC37CC9",
  "59FE193D73752516",
  "5433C00BD5343624",
  "BE8B92C281A82DC5",
  "71469BA4796CD3E4"
];

  if (whitelist.includes(id)) {
    await sendDiscord({
      title: "COSMETICS AUTHORIZED",
      description: `A staff Member \`${id}\` Has joined the game.`,
      color: 65280,
      timestamp: new Date().toISOString()
    });
    return { status: "authorized" };
  }

  // Get inventory
  const invData = await pfPost("/Server/GetUserInventory", { PlayFabId: id });
  const inv = invData.Inventory || [];

  const bad = [];
  for (const item of inv) {
    for (const flag of flags) {
      if (item.ItemId.includes(flag)) {
        bad.push({ name: item.ItemId, instance: item.ItemInstanceId });
      }
    }
  }

  if (bad.length === 0) {
    return { status: "clean" };
  }

  // Get last login IP
  const profile = await pfPost("/Server/GetPlayerProfile", {
    PlayFabId: id,
    ProfileConstraints: { ShowLastLogin: true }
  });
  const ip = profile.PlayerProfile?.LastLoginAddress ?? "unknown";

  // Revoke items
  for (const b of bad) {
    await pfPost("/Server/RevokeInventoryItem", {
      PlayFabId: id,
      ItemInstanceId: b.instance
    });
  }

  // Ban
  await pfPost("/Server/BanUsers", {
    Bans: [{
      PlayFabId: id,
      IPAddress: ip,
      Reason: "UNAUTHORIZED ASSET POSSESSION",
      DurationInHours: 175200
    }]
  });

  // Discord alert
  await sendDiscord({
    title: "UNAUTHORIZED COSMETICS",
    color: 16711680,
    fields: [
      { name: "PlayFab ID", value: `\`${id}\``, inline: true },
      { name: "Network IP", value: `\`${ip}\``, inline: true },
      { name: "Violations", value: bad.map(b => b.name).join(", ") }
    ],
    footer: { text: "Made by unity.lolz" },
    timestamp: new Date().toISOString()
  });

  return { status: "terminated" };
}
