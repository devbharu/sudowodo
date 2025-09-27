const axios = require('axios');
const https = require('https');

const TENABLE_ACCESS = process.env.TENABLE_ACCESS;
const TENABLE_SECRET = process.env.TENABLE_SECRET;
const TENABLE_BASE = process.env.TENABLE_BASE || 'https://localhost:8834';

const axiosNessus = axios.create({
  baseURL: TENABLE_BASE,
  headers: { 'X-ApiKeys': `accessKey=${TENABLE_ACCESS}; secretKey=${TENABLE_SECRET}`, 'Content-Type': 'application/json' },
  httpsAgent: new https.Agent({ rejectUnauthorized: false })
});

async function getNessusTemplates(req, res) {
  try {
    console.log('Fetching Nessus templates from', TENABLE_BASE);
    const resp = await axiosNessus.get('/editor/scan/templates');
    const templates = resp.data.templates || [];
    res.json({ ok: true, templates: templates.map(t => ({ name: t.name, uuid: t.uuid })) });
  } catch (err) {
    console.error('Fetch templates error:', err);
    res.status(500).json({ error: 'fetch_templates_failed' });
  }
}

async function runNessusScan(req, res) {
  try {
    const { target, scanName, templateUuid } = req.body;
    if (!target || !templateUuid) return res.status(400).json({ error: 'target and templateUuid required' });

    const createResp = await axiosNessus.post('/scans', { uuid: templateUuid, settings: { name: scanName || 'API Scan', text_targets: target } });
    const scanId = createResp.data.id || createResp.data.scan?.id;

    await axiosNessus.post(`/scans/${scanId}/launch`);

    let finished = false;
    let scanData;
    while (!finished) {
      await new Promise(r => setTimeout(r, 5000));
      scanData = (await axiosNessus.get(`/scans/${scanId}`)).data;
      const status = (scanData.info?.status || scanData.status || '').toLowerCase();
      if (['completed','finished','stopped'].includes(status)) finished = true;
    }

    res.json({ ok: true, scanType: 'nessus', scanId, target, status: scanData.info?.status || scanData.status, scanDetails: scanData });
  } catch (err) {
    console.error('Nessus scan error:', err);
    res.status(500).json({ error: 'nessus_scan_failed', message: err.message });
  }
}

module.exports = { getNessusTemplates, runNessusScan };
