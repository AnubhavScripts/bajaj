const express = require('express');
const cors = require('cors');
const { processEdges } = require('./processor');

const app = express();
app.use(cors());
app.use(express.json());

// static user info — would come from auth/db in real app
const USER_INFO = {
  user_id: "anubhav_parashar_24042026",
  email_id: "ap9748@srmist.edu.in",
  college_roll_number: "RA2311003030535"
}

// just returns who you are — handy for verifying the API is live
app.get('/bfhl', (req, res) => {
  res.json({ user: USER_INFO });
});

app.post('/bfhl', (req, res) => {
  const { data } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "data field must be an array" });
  }

  try {
    const result = processEdges(data);
    return res.json({
      user: USER_INFO,
      result
    });
  } catch (err) {
    console.error("something broke:", err);
    return res.status(500).json({ error: "internal server error" });
  }
});

// health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'bfhl api is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`server started on port ${PORT}`);
});
