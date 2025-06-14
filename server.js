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
const SEVENSHIFTS_API_KEY = process.env.SEVENSHIFTS_API_KEY;
const SEVENSHIFTS_COMPANY_ID = process.env.SEVENSHIFTS_COMPANY_ID;
const SEVENSHIFTS_LOCATION_ID = process.env.SEVENSHIFTS_LOCATION_ID;

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

// Google OAuth start
app.get("/auth", (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar.events.readonly&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

// Google OAuth callback
app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("❌ No auth code received");

  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
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
      <p>Expires in: ${expires_in} seconds</p>
      <p>You can now <a href="/events?token=${access_token}">fetch events</a> or <a href="/sync?token=${access_token}">sync to 7shifts</a>.</p>
    `);
  } catch (err) {
    console.error("❌ Token exchange error:", err.response?.data || err.message);
    res.status(500).send("❌ Token exchange failed");
  }
});

// Fetch calendar events
app.get("/events", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send("❌ Missing access_token");

  try {
    const response = await axios.get("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime"
      }
    });

    const events = response.data.items.map(event => ({
      summary: event.summary,
      start: event.start,
      end: event.end
    }));

    res.json({ count: events.length, events });

  } catch (err) {
    console.error("❌ Failed to fetch events:", err.response?.data || err.message);
    res.status(500).send("❌ Calendar fetch failed");
  }
});

// Sync events to 7shifts
app.get("/sync", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send("❌ Missing access_token");

  try {
    const calRes = await axios.get("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime"
      }
    });

    const shiftsCreated = [];

    for (const event of calRes.data.items) {
      const shift = {
        location_id: parseInt(SEVENSHIFTS_LOCATION_ID),
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        published: true,
        notes: event.summary || "Imported from Google Calendar"
      };

      const shiftRes = await axios.post(
        `https://api.7shifts.com/v2/company/${SEVENSHIFTS_COMPANY_ID}/shifts`,
        shift,
        {
          headers: {
            Authorization: `Bearer ${SEVENSHIFTS_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      shiftsCreated.push(shiftRes.data.data);
    }

    res.json({
      message: `✅ Synced ${shiftsCreated.length} events to 7shifts`,
      shifts: shiftsCreated
    });

  } catch (err) {
    console.error("❌ Sync failed:", err.response?.data || err.message);
    res.status(500).send("❌ Sync to 7shifts failed. Check server logs.");
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});