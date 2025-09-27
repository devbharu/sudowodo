// controllers/fullScanController.js
const { runNmapScan, isValidTarget } = require('./nmapController');
const axios = require('axios');

const OSV_BASE = 'https://api.osv.dev/v1';
const ECOSYSTEMS = ['PyPI','npm','Maven','Go','Crates','NuGet','Packagist','Debian','Alpine','Ubuntu','SUSE'];

/** Fetch full vuln object by id (CVE or OSV id) */
async function fetchVulnById(id) {
  try {
    const resp = await axios.get(`${OSV_BASE}/vulns/${encodeURIComponent(id)}`, { timeout: 15000 });
    return resp.data;
  } catch {
    return null;
  }
}

/** Batch query OSV */
async function queryOSVBatch(queries) {
  if (!queries.length) return null;
  try {
    const resp = await axios.post(`${OSV_BASE}/querybatch`, { queries }, { timeout: 20000 });
    return resp.data;
  } catch (e) {
    console.error('querybatch error', e.message);
    return null;
  }
}

/** Extract open ports from Nmap parsed XML object (robust) */
function extractOpenPortsFromNmapParsed(parsed) {
  const hosts = parsed?.nmaprun?.host
    ? (Array.isArray(parsed.nmaprun.host) ? parsed.nmaprun.host : [parsed.nmaprun.host])
    : [];

  const openPorts = [];

  for (const h of hosts) {
    const address = h.address?.addr || (Array.isArray(h.address) && h.address[0]?.addr) || null;
    const portsRaw = h.ports?.port || [];
    const ports = Array.isArray(portsRaw) ? portsRaw : [portsRaw];

    for (const p of ports) {
      let state = p.state?.[0]?.$?.state || p.state?.state || p.$?.state;
      if (!state) continue;
      if (state.toLowerCase() !== 'open') continue;

      let svc = p.service?.[0] || p.service || {};
      openPorts.push({
        host: address,
        port: p.$?.portid || p.portid || p.port || null,
        protocol: p.$?.protocol || p.protocol || null,
        service: svc.$?.name || svc.name || null,
        product: svc.$?.product || svc.product || null,
        version: svc.$?.version || svc.version || null,
        extraInfo: svc.$?.extrainfo || svc.extrainfo || null,
        cpe: Array.isArray(svc.cpe) ? svc.cpe[0] : (svc.cpe || null)
      });
    }
  }

  return openPorts;
}

/** Build best-effort OSV queries for a product/version */
function buildQueriesForProduct(product, version) {
  if (!product) return [];
  const name = product.toLowerCase().replace(/\s+/g,' ').replace(/\/.*$/,'').trim();
  const queries = [];
  const useEco = ECOSYSTEMS.slice(0,6);
  for (const eco of useEco) {
    queries.push({ package: { name, ecosystem: eco }, version: version || '' });
  }
  return queries;
}

/** Nmap-only full scan with OSV enrichment */
async function runFullScan(req, res) {
  const target = (req.body.target || '').trim();
  if (!isValidTarget(target)) return res.status(400).json({ error: 'invalid target' });

  try {
    const nmapReq = { body: req.body };
    const nmapResult = await runNmapScan(nmapReq, null);

    if (!nmapResult || nmapResult.ok === false) {
      return res.status(500).json({ error: 'nmap_failed', detail: nmapResult || 'nmap returned no result' });
    }

    const openPorts = extractOpenPortsFromNmapParsed(nmapResult.result || nmapResult);

    // Build OSV queries
    const allQueries = [];
    openPorts.forEach(svc => {
      const queries = buildQueriesForProduct(svc.product || svc.service, svc.version);
      queries.forEach(q => q._meta = { host: svc.host, port: svc.port, product: svc.product, version: svc.version });
      allQueries.push(...queries);
    });

    // Deduplicate
    const seen = new Set();
    const dedup = [];
    allQueries.forEach(q => {
      const key = `${q.package.name}::${q.package.ecosystem}::${q.version || ''}`;
      if (!seen.has(key)) { seen.add(key); dedup.push(q); }
    });

    // Batch OSV queries
    const MAX_BATCH = 200;
    const batches = [];
    for (let i = 0; i < dedup.length; i += MAX_BATCH) batches.push(dedup.slice(i, i + MAX_BATCH));

    const foundIds = new Map();
    for (const batch of batches) {
      const resp = await queryOSVBatch(batch);
      if (!resp?.results) continue;
      await Promise.all(resp.results.map(async r => {
        if (!r?.vulns) return;
        for (const v of r.vulns) {
          if (!foundIds.has(v.id)) {
            const full = await fetchVulnById(v.id);
            if (full) foundIds.set(v.id, full);
          }
        }
      }));
    }

    const osvVulnerabilities = Array.from(foundIds.values());

    return res.json({
      ok: true,
      target,
      summary: { scannedAt: new Date().toISOString(), tools: ['nmap', 'osv.dev'] },
      nmap: { args: nmapResult.nmapArgs || nmapResult.args || req.body.args || '', openPorts, osvVulnerabilities },
      raw: { nmap: nmapResult }
    });

  } catch (err) {
    console.error('fullScan error:', err);
    return res.status(500).json({ error: 'full_scan_failed', message: err.message || String(err) });
  }
}

module.exports = { runFullScan };
