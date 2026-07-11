const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Simple in-memory balance for now
let balance = 1000;

app.get('/api/balance', (req, res) => {
  res.json({ balance });
});

app.post('/api/update-balance', (req, res) => {
  const { delta } = req.body;
  if (typeof delta !== 'number') {
    return res.status(400).json({ error: 'delta must be a number' });
  }
  balance += delta;
  res.json({ balance });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
