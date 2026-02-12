const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static frontend from /public
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
