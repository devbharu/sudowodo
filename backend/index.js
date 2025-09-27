require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

const { runNmapScan } = require('./controllers/scans/nmapController');
const { runNiktoScan } = require('./controllers/scans/niktoController');
const { getNessusTemplates, runNessusScan } = require('./controllers/scans/nessusController');
const { runFullScan } = require('./controllers/scans/scan-allController');
const { registerUser, loginUser, getUserProfile } = require('./controllers/user/userController');
const authMiddleware = require('./middleware/middleware');

// ------------------- Mongoose Connection -------------------
const MONGO_URI =  'mongodb+srv://manu:RDlHx3Hxi7JehM67@cluster0.vqhh5ao.mongodb.net/sudowudo';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// -----------------------------------------------------------

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------- Routes -------------------------------
app.post('/scan', runNmapScan);
app.post('/nikto-scan', runNiktoScan);
app.get('/nessus-templates', getNessusTemplates);
app.post('/nessus-scan', runNessusScan);
app.post('/scan-full', runFullScan);

app.post('/register', registerUser);
app.post('/login', loginUser);
app.get('/profile', authMiddleware, getUserProfile);

// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// -------------------- Start Server -------------------------
const PORT = process.env.PORT || 3010;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
