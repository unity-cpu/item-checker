// PlayFab CloudScript - Add this to your CloudScript in PlayFab Game Manager
// This function checks cosmetics when a player logs in

handlers.CheckCosmetics = function (args, context) {
  // Get the player ID from context
  const playerId = context.playerId;
  
  if (!playerId) {
    return {
      success: false,
      error: "Player ID not found"
    };
  }

  // Your Vercel endpoint URL
  const vercelUrl = "https://YOUR-PROJECT-NAME.vercel.app/cos-check";
  
  // Optional: Your API key (if you set one in .env)
  const apiKey = "YOUR-API-KEY-HERE"; // Set in PlayFab Title Data if you want

  try {
    // Call your Vercel cosmetics checker
    const response = http.request({
      url: vercelUrl,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify({
        playfabId: playerId
      })
    });

    const result = JSON.parse(response);

    // Log the result for debugging
    log.info("Cosmetics check result: " + JSON.stringify(result));

    return {
      success: true,
      result: result
    };

  } catch (error) {
    log.error("Error calling cosmetics checker: " + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
};

// Optional: Call CheckCosmetics on player login
handlers.LoginCheck = function (args, context) {
  const cosmetics = handlers.CheckCosmetics({}, context);
  return cosmetics;
};
