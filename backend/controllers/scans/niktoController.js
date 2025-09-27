const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const scan = require('../../models/scan');
require('dotenv').config();

 // adjust path if your model file differs
const NIKTO_BIN = process.env.NIKTO_PATH || '/opt/homebrew/bin/nikto';

async function runNiktoScan(req, res) {
  const target = (req.body.target || '').toString().trim();

  if (!target) return res.status(400).json({ error: 'invalid target' });

  try { await fs.access(NIKTO_BIN); } 
  catch {
    return res.status(500).json({ error: 'nikto_not_found', message: `Nikto not found at ${NIKTO_BIN}` });
  }

  let clientArgs = req.body.args;
  if (typeof clientArgs === 'string') clientArgs = clientArgs.split(/\s+/).filter(Boolean);
  if (!Array.isArray(clientArgs)) clientArgs = [];

  const outputFile = path.join(os.tmpdir(), `nikto_${Date.now()}_${Math.floor(Math.random()*10000)}.txt`);
  const niktoArgs = [...clientArgs, '-h', target, '-o', outputFile];

  let execError = null, execStdout = '', execStderr = '';

  try {
    const result = await execFileAsync(NIKTO_BIN, niktoArgs, { timeout: 180_000, maxBuffer: 100*1024*1024 });
    execStdout = result.stdout?.toString() || '';
    execStderr = result.stderr?.toString() || '';
  } catch (err) {
    execError = err;
    execStdout = (err.stdout || '')?.toString?.() || '';
    execStderr = (err.stderr || '')?.toString?.() || '';
    console.warn('Nikto exited with error:', err.message || err);
  }

  let rawOutput = '';
  try { rawOutput = await fs.readFile(outputFile, 'utf8'); } catch (e) { rawOutput = execStdout || ''; }
  finally { await fs.unlink(outputFile).catch(() => {}); }

  // Simple parsing: collect lines that look like findings
  const lines = rawOutput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const findings = [];
  for (const ln of lines) {
    if (ln.startsWith('+') || /OSVDB-|CVE-|Server:|Allowed Methods:|Title:|vulnerab|Identified server/i.test(ln)) {
      findings.push(ln.replace(/^\+\s?/, ''));
    }
  }
  const parsed = { findings, lineCount: lines.length };

  // Save scan to DB
  try {
    const scanDoc = await scan.create({
      scanType: 'nikto',
      nikto: {
        target,
        args: clientArgs,
        parsed,
        rawOutput,
        timestamp: new Date()
      }
    });

    return res.json({
      ok: !execError,
      scanType: 'nikto',
      target,
      niktoPath: NIKTO_BIN,
      niktoArgs,
      exec: { error: execError ? String(execError.message || execError) : null, stdout: execStdout, stderr: execStderr },
      rawOutput,
      parsed,
      scanId: scanDoc._id,
      note: 'Raw Nikto output returned and saved to DB'
    });
  } catch (err) {
    console.error('Failed to save nikto scan:', err);
    // Return scan result but indicate DB save failure
    return res.status(500).json({
      ok: !execError,
      scanType: 'nikto',
      target,
      niktoPath: NIKTO_BIN,
      niktoArgs,
      exec: { error: execError ? String(execError.message || execError) : null, stdout: execStdout, stderr: execStderr },
      rawOutput,
      parsed,
      error: 'failed_to_save_scan',
      message: err.message || String(err)
    });
  }
}

module.exports = { runNiktoScan };
