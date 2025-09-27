import { useState, useEffect } from "react";

export default function ScanForm({ onSubmit }) {
  const [scanType, setScanType] = useState("nmap");
  const [target, setTarget] = useState("");
  const [args, setArgs] = useState("");
  const [niktoArgs, setNiktoArgs] = useState("");
  const [scanName, setScanName] = useState("");
  const [templateUuid, setTemplateUuid] = useState("");
  const [templates, setTemplates] = useState([]);
  const [status, setStatus] = useState("");

  // Load Nessus templates
  useEffect(() => {
    if (scanType === "nessus") {
      fetch("/nessus-templates")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) setTemplates(data.templates);
        })
        .catch(() => setTemplates([]));
    }
  }, [scanType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!target) return setStatus("Target is required");

    const body = { target };
    if (scanType === "nmap") body.args = args ? args.split(" ") : [];
    if (scanType === "nikto") body.niktoArgs = niktoArgs ? niktoArgs.split(" ") : [];
    if (scanType === "nessus") {
      body.scanName = scanName;
      body.templateUuid = templateUuid;
      if (!templateUuid) return setStatus("Select a Nessus template");
    }
    if (scanType === "full") {
      if (args) body.args = args.split(" ");
      if (niktoArgs) body.niktoArgs = niktoArgs.split(" ");
    }

    setStatus("Scanning...");
    onSubmit(scanType, body);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <label>Scan Type</label>
      <select value={scanType} onChange={(e) => setScanType(e.target.value)} className="w-full p-2 border rounded">
        <option value="nmap">Nmap</option>
        <option value="nikto">Nikto</option>
        <option value="nessus">Nessus</option>
        <option value="full">Full Scan</option>
      </select>

      <label>Target</label>
      <input
        type="text"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="example.com or 45.33.32.156"
        className="w-full p-2 border rounded"
      />

      {(scanType === "nmap" || scanType === "full") && (
        <>
          <label>Nmap Args (optional)</label>
          <input
            type="text"
            value={args}
            onChange={(e) => setArgs(e.target.value)}
            placeholder="-sT -p 22,80,443 -T4"
            className="w-full p-2 border rounded"
          />
        </>
      )}

      {(scanType === "nikto" || scanType === "full") && (
        <>
          <label>Nikto Args (optional)</label>
          <input
            type="text"
            value={niktoArgs}
            onChange={(e) => setNiktoArgs(e.target.value)}
            placeholder="-p 80,443"
            className="w-full p-2 border rounded"
          />
        </>
      )}

      {scanType === "nessus" && (
        <>
          <label>Nessus Scan Name</label>
          <input
            type="text"
            value={scanName}
            onChange={(e) => setScanName(e.target.value)}
            placeholder="My API Scan"
            className="w-full p-2 border rounded"
          />

          <label>Template</label>
          <select value={templateUuid} onChange={(e) => setTemplateUuid(e.target.value)} className="w-full p-2 border rounded">
            <option value="">Select a template</option>
            {templates.map((t) => (
              <option key={t.uuid} value={t.uuid}>{t.name}</option>
            ))}
          </select>
        </>
      )}

      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">{status}</span>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Run Scan</button>
      </div>
    </form>
  );
}
