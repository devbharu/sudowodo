const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
require('dotenv').config();
const NIKTO_BIN = process.env.NIKTO_PATH || '/opt/homebrew/bin/nikto';

async function runNiktoScan(req, res) {
  const target = (req.body.target || '').toString().trim();

  if (!target) return res.status(400).json({ error: 'invalid target' });

  try { await fs.access(NIKTO_BIN); } 
  catch { return res.status(500).json({ error: 'nikto_not_found', message: `Nikto not found at ${NIKTO_BIN}` }); }

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
  try { rawOutput = await fs.readFile(outputFile, 'utf8'); } catch {}
  finally { await fs.unlink(outputFile).catch(() => {}); }

  res.json({
    ok: !execError,
    scanType: 'nikto',
    target,
    niktoPath: NIKTO_BIN,
    niktoArgs,
    exec: { error: execError ? String(execError.message || execError) : null, stdout: execStdout, stderr: execStderr },
    rawOutput,
    note: 'Raw Nikto output returned'
  });
}

module.exports = { runNiktoScan };
