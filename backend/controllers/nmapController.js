const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const parseXml = require('xml2js').parseStringPromise;
require('dotenv').config();
const NMAP_BIN = process.env.NMAP_PATH || 'nmap';

function isValidTarget(t) {
  if (!t || typeof t !== 'string') return false;
  t = t.trim();
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(t) || /^[A-Za-z0-9.-]+$/.test(t);
}

async function runNmapScan(req, res) {
  try {
    const target = (req.body.target || '').trim();
    let args = req.body.args;
    if (typeof args === 'string') args = args.split(/\s+/).filter(Boolean);
    if (!isValidTarget(target)) return res.status(400).json({ error: 'invalid target' });

    const baseArgs = ['-oX', '-'];
    const customArgs = Array.isArray(args) && args.length
      ? args.map(tok => /^[A-Za-z0-9\-\_\,\.\=\*\/:]+$/.test(tok) ? tok : null).filter(Boolean)
      : ['-sV', '-p', '1-1024', '-Pn', '-T4'];

    const finalArgs = [...customArgs, ...baseArgs, target];
    const { stdout } = await execFileAsync(NMAP_BIN, finalArgs, { timeout: 180_000, maxBuffer: 100*1024*1024 });
    const parsed = await parseXml(stdout.toString(), { explicitArray: false, mergeAttrs: true });

    res.json({ ok: true, scanType: 'nmap', nmapArgs: finalArgs, result: parsed});
  } catch (err) {
    console.error('Nmap error:', err);
    res.status(500).json({ error: 'scan_failed', message: err.message || String(err) });
  }
}

module.exports = { runNmapScan, isValidTarget };
