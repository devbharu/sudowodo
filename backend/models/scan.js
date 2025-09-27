const mongoose = require('mongoose');

const NmapSchema = new mongoose.Schema({
  target: { type: String,  },
  args: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now },
  rawXml: { type: String, default: '' },
  parsed: { type: Object, default: {} } // Parsed JSON version
});

const NiktoSchema = new mongoose.Schema({
  target: { type: String },
  args: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now },
  parsed: { type: Object, default: {} } // JSON parsed result
});

const OSVSchema = new mongoose.Schema({
  target: { type: String  },
  vulnerabilities: { type: [Object], default: [] }, // list of OSV vulnerabilities
  timestamp: { type: Date, default: Date.now }
});

const ScanSchema = new mongoose.Schema({
  scanType: { type: String, enum: ['nmap', 'nikto', 'nessus', 'full'], required: true },
  nmap: { type: NmapSchema, default: {} },
  nikto: { type: NiktoSchema, default: {} },
  osv: { type: OSVSchema, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', ScanSchema);
