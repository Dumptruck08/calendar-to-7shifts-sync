const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Load environment variables
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Homepage
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Calendar to 7shifts Sync</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 2rem;
          background-color: #f4f4f4;
          color: #333;
        }
        a {
          font-size: 1.2rem;
          text-decoration: none;
          background: #4CAF50;
          color: white;
          padding: 0.6rem 1rem;
          border-radius: 4px;
        }
        a:hover {
          background: #45a049;
        }
      </style>
    </head>
    <body>
      <h2>✅ Calendar to 7shifts Sync is Live</h2>
      <p>Click below to authorize access to your Google Calendar:</p>
      <a href="/auth">🔐 Connect Google Calendar</a>
    </body>
    </html>
  `);
});

// OAuth authorization redirect
app.get("/auth", (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

// Google OAuth2 redirect handler
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send("❌ No auth code received from Google.");
  }

  console.log("✅ Received auth code:", code);

  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, // ✅ Correct usage of env variable
        grant_type: 'authorization_code'
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    console.log("🎉 Access Token:", access_token);
    console.log("🔁 Refresh Token:", refresh_token);
    console.log("⏱️ Expires In:", expires_in, "seconds");

    res.send(`
      <h2>✅ Google access token received!</h2>
      <p><strong>Access Token:</strong> ${access_token}</p>
      <p><strong>Refresh Token:</strong> ${refresh_token}</p>
      <p>Save these tokens securely to access Google Calendar later.</p>
    `);
  } catch (error) {
    console.error("❌ Token exchange error:", error.response?.data || error.message);
    res.status(500).send("❌ Token exchange failed");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));