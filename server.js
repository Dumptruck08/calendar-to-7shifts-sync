const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

app.get("/", (req, res) => {
  res.send(`<a href="/auth">🔐 Connect Google Calendar</a>`);
});

app.get("/auth", (req, res) => {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=https://www.googleapis.com/auth/calendar.events.readonly&access_type=offline&prompt=consent`;
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send("❌ No code returned from Google");

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, refresh_token } = response.data;
    console.log("✅ Tokens:", response.data);

    res.send(`
      <h2>✅ Connected!</h2>
      <p>Access Token: ${access_token}</p>
      <p>Refresh Token: ${refresh_token}</p>
    `);
  } catch (err) {
    console.error("❌ Token exchange error:", err.response?.data || err.message);
    res.status(500).send("Token exchange failed");
  }
});

app.get("/events", async (req, res) => {
  const token = req.query.token;
  try {
    const result = await axios.get('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        timeMin: new Date().toISOString(),
        maxResults: 5,
        singleEvents: true,
        orderBy: "startTime"
      }
    });
    res.json(result.data.items.map(event => ({
      summary: event.summary,
      start: event.start,
      end: event.end
    })));
  } catch (err) {
    console.error("Error fetching events:", err.response?.data || err.message);
    res.status(500).send("Calendar fetch failed");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server listening on ${PORT}`));

