import { useState } from "react";
import ScanForm from "../features/scans/ScanForm";
import ScanProgress from "../features/scans/ScanProgress";

export default function NewScan() {
  const [scanInProgress, setScanInProgress] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scanData, setScanData] = useState(null);
  const [lastRawXml, setLastRawXml] = useState("");

  const API_URL = "http://localhost:3008";

  const handleScan = async (scanType, body) => {
    setScanInProgress(true);
    setShowResults(false);
    setScanData(null);
    setLastRawXml("");

    try {
      const endpoint =
        scanType === "nmap"
          ? `${API_URL}/scan`
          : scanType === "nikto"
          ? `${API_URL}/nikto-scan`
          : scanType === "nessus"
          ? `${API_URL}/nessus-scan`
          : `${API_URL}/scan-full`;

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(await resp.text());

      const data = await resp.json();
      setScanData(data);
      setLastRawXml(data.nmap?.rawXml || "");
      setShowResults(true);
    } catch (err) {
      console.error(err);
      alert("Scan failed: " + (err.message || err));
    } finally {
      setScanInProgress(false);
    }
  };

  const downloadXml = () => {
    if (!lastRawXml) return alert("No XML available (Nmap only)");
    const blob = new Blob([lastRawXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nmap-scan.xml";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyJson = async () => {
    if (!scanData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(scanData, null, 2));
      alert("Copied JSON");
    } catch (e) {
      alert("Copy failed: " + e.message);
    }
  };

  return (
    <div className="h-full px-6 py-4 overflow-y-auto">
      {!scanInProgress && !showResults && <ScanForm onSubmit={handleScan} />}
      {scanInProgress && <ScanProgress />}
      {showResults && scanData && (
        <div>
          <pre className="bg-gray-800 text-white p-4 rounded overflow-auto">
            {JSON.stringify(scanData, null, 2)}
          </pre>
          <div className="mt-2 flex gap-2">
            <button
              className="px-3 py-2 rounded bg-blue-600 text-white font-semibold"
              onClick={downloadXml}
            >
              Download raw XML
            </button>
            <button
              className="px-3 py-2 rounded bg-green-600 text-white font-semibold"
              onClick={copyJson}
            >
              Copy JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
