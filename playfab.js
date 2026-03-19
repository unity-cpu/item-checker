import axios from 'axios';

const TITLE_ID = process.env.PLAYFAB_TITLE_ID;
const SERVER_SECRET = process.env.PLAYFAB_SERVER_SECRET;

if (!TITLE_ID || !SERVER_SECRET) {
  throw new Error("Missing PlayFab TITLE_ID or SERVER_SECRET in .env");
}

const PLAYFAB_API = `https://${TITLE_ID}.playfabapi.com`;

async function pfPost(endpoint, data) {
  const resp = await axios.post(
    `${PLAYFAB_API}${endpoint}`,
    { ...data, Authentication: SERVER_SECRET ? { Authentication: SERVER_SECRET } : {} },
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (resp.data.code !== 200 || resp.data.status !== 'OK') {
    throw new Error(`PlayFab error: ${JSON.stringify(resp.data)}`);
  }
  return resp.data.data;
}

async function sendDiscord(embed) {
  await axios.post(process.env.DISCORD_WEBHOOK, { embeds: [embed] });
}

export async function checkCosmetics(id, webhook) {
  const flags = ["LBAAD.", "LBAAK.", "LBAAZ.", "COFOUNDER.", "FORESTGUIDE.", "MILK.", "TECHNO."];

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
