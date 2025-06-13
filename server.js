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
