require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const { runNmapScan } = require('./controllers/nmapController');
const { runNiktoScan } = require('./controllers/niktoController');
const { getNessusTemplates, runNessusScan } = require('./controllers/nessusController');
const { runFullScan } = require('./controllers/scan-allController');
 
// ...const { scanWorkflow } = require('./functions/scanWorkflow');


const app = express();
 
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.post('/scan', runNmapScan);
app.post('/nikto-scan', runNiktoScan);
app.get('/nessus-templates', getNessusTemplates);
app.post('/nessus-scan', runNessusScan);
app.post('/scan-full', runFullScan);


// Serve frontend
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
