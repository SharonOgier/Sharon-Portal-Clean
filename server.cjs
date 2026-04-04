const express = require("express");
const path = require("path");

const app = express();

// Serve static files (React build)
app.use(express.static(path.join(__dirname, "dist")));

// Host-based routing fix
app.get("*", (req, res) => {
  const host = req.headers.host || "";

  // Portal domain → serve React app
  if (host.includes("portal.sharonogier.com")) {
    return res.sendFile(path.join(__dirname, "dist", "index.html"));
  }

  // Main domain → serve marketing website
  return res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
