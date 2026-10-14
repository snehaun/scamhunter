import { useState, useEffect } from "react";
import "./App.css";

const API = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/scam`;

const sampleMessages = [
  {
    label: "Prize scam",
    text: "URGENT! You won ₹50,000. Share your OTP immediately to claim your prize.",
  },
  {
    label: "Bank warning",
    text: "Your bank account will be blocked today. Verify your password immediately at http://fake-bank-example.com",
  },
  {
    label: "Normal message",
    text: "Hi, are we still meeting for lunch tomorrow at 1 PM?",
  },
];

function App() {
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  const [urlToCheck, setUrlToCheck] = useState("");
  const [urlResult, setUrlResult] = useState(null);
  const [urlError, setUrlError] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  const [analysis, setAnalysis] = useState("");
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedScan, setSelectedScan] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const totalScans = history.length;

const highRiskScans = history.filter(
  (item) => item.riskLevel?.toUpperCase() === "HIGH"
).length;

const mediumRiskScans = history.filter(
  (item) => item.riskLevel?.toUpperCase() === "MEDIUM"
).length;

const lowRiskScans = history.filter(
  (item) => item.riskLevel?.toUpperCase() === "LOW"
).length;

  const filteredHistory = history.filter((item) => {
    const matchesSearch = (item.message || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRisk =
      riskFilter === "ALL" ||
      (item.riskLevel || "").toUpperCase() === riskFilter;
    return matchesSearch && matchesRisk;
  });

  async function loadHistory() {
    try {
      const response = await fetch(`${API}/history`);
      if (!response.ok) throw new Error("Failed to load scan history");
      const data = await response.json();
      setHistory(
        data.slice(0, 5).map((item) => ({
          ...item,
          time: item.scannedAt
            ? new Date(item.scannedAt).toLocaleString()
            : "Unknown time",
        }))
      );
    } catch (err) {
      console.error("Could not load scan history:", err);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function closeDetails() {
    setSelectedScan(null);
    setDetailError("");
    setDetailLoading(false);
  }

  async function viewScanDetails(id) {
    setDetailLoading(true);
    setDetailError("");
    setSelectedScan(null);
    try {
      const response = await fetch(`${API}/history/${id}`);
      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Scan details endpoint returned 404. Check that the backend detail route is added and the server restarted."
            : "Failed to load scan details."
        );
      }
      setSelectedScan(await response.json());
    } catch (err) {
      setDetailError(err.message || "Could not load scan details.");
    } finally {
      setDetailLoading(false);
    }
  }

  
async function analyzeMessage() {
  if (!message.trim()) {
    setError("Please enter a message to analyze.");
    setAnalysis("");
    setRisk(null);
    return;
  }

  setLoading(true);
  setError("");
  setAnalysis("");
  setRisk(null);

  try {
    // Step 1: Create and save the rule-based scan.
    const riskResponse = await fetch(`${API}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
    });

    const riskData = await riskResponse.json();

    if (!riskResponse.ok || riskData.error) {
      throw new Error(
        riskData.error || "Rule-based analysis failed."
      );
    }

    setRisk(riskData);

    // Stop if the backend did not return the saved record ID.
    if (riskData.historyId == null) {
      throw new Error(
        "The backend did not return historyId. Check ScamController.java."
      );
    }

    // Step 2: Generate Gemini analysis and update the same record.
    try {
      const aiResponse = await fetch(`${API}/ai-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          historyId: riskData.historyId,
        }),
      });

      const aiData = await aiResponse.json();

      if (!aiResponse.ok || aiData.error || !aiData.analysis) {
        throw new Error(
          aiData.error || "Gemini analysis failed."
        );
      }

      setAnalysis(aiData.analysis);
    } catch (aiErr) {
      console.error("Gemini analysis failed:", aiErr);
      setAnalysis(
        "Gemini AI is temporarily unavailable. You can still use the rule-based risk assessment."
      );
    }
  } catch (err) {
    setError(
      err.message?.includes("Failed to fetch")
        ? "Cannot connect to the backend. Check that your Java server is running."
        : err.message || "Analysis failed."
    );
  } finally {
    // Refresh saved scans even when Gemini fails.
    await loadHistory();
    setLoading(false);
  }
}


  function downloadReport() {
    if (!risk && !analysis) return;

    const report = [
      "SCAM HUNTER AI - SCAN REPORT",
      "================================",
      `Date: ${new Date().toLocaleString()}`,
      "",
      "ANALYZED MESSAGE",
      message,
      "",
      "RULE-BASED RISK ASSESSMENT",
      `Risk score: ${risk ? risk.riskScore + "/100" : "Unavailable"}`,
      `Risk level: ${risk ? risk.riskLevel : "Unavailable"}`,
      "",
      "WARNING SIGNS",
      ...(risk?.warnings?.length
        ? risk.warnings.map((warning) => `- ${warning}`)
        : ["No warning signs detected by the current rules."]),
      "",
      "GEMINI AI ANALYSIS",
      analysis || "AI analysis unavailable.",
      "",
      "Note: This automated report is not a guarantee of safety.",
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "scam-hunter-report.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function checkUrl() {
    if (!urlToCheck.trim()) {
      setUrlError("Please enter a URL.");
      setUrlResult(null);
      return;
    }

    setUrlLoading(true);
    setUrlError("");
    setUrlResult(null);

    try {
      const response = await fetch(`${API}/check-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToCheck.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "URL scan failed.");
      }
      setUrlResult(data);
    } catch (err) {
      setUrlError(
        err.message?.includes("Failed to fetch")
          ? "Cannot connect to the backend. Check that your Java server is running."
          : err.message || "Could not check this URL."
      );
    } finally {
      setUrlLoading(false);
    }
  }

  async function clearHistory() {
    if (!window.confirm("Delete all saved scan history?")) return;

    try {
      const response = await fetch(`${API}/history`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to clear history");
      setHistory([]);
      closeDetails();
    } catch (err) {
      console.error("Could not clear history:", err);
      alert("Could not clear scan history. Please try again.");
    }
  }

  function renderUrlResult() {
    if (!urlResult) return null;

    const attributes = urlResult.data?.attributes;
    const stats = attributes?.last_analysis_stats;

    if (!stats) {
      return (
        <div className="analysis-result">
          <h3>URL Report</h3>
          <p>A report was retrieved, but analysis statistics are not available.</p>
        </div>
      );
    }

    const malicious = stats.malicious ?? 0;
    const suspicious = stats.suspicious ?? 0;
    const harmless = stats.harmless ?? 0;
    const undetected = stats.undetected ?? 0;

    const verdict =
  malicious > 0
    ? "Potentially malicious"
    : suspicious > 0
    ? "Suspicious"
    : "No malicious detections reported";

    return (
      <div className="analysis-result">
        <div className="result-label">VIRUSTOTAL URL REPORT</div>
        <h3>{verdict}</h3>
        <div className="url-stats">
          <p>🔴 Malicious: <strong>{malicious}</strong></p>
          <p>🟠 Suspicious: <strong>{suspicious}</strong></p>
          <p>🟢 Harmless: <strong>{harmless}</strong></p>
          <p>⚪ Undetected: <strong>{undetected}</strong></p>
        </div>
        <p>
          <strong>Domain category:</strong>{" "}
          {attributes.web_category || "Unknown"}
        </p>
        <p className="disclaimer">
          This verdict reflects available VirusTotal detections, not a
          guarantee that the URL is safe or malicious.
        </p>
        {urlResult.data?.id && (
          <p>
            <a
              href={`https://www.virustotal.com/gui/url/${urlResult.data.id}`}
              target="_blank"
              rel="noreferrer"
            >
              View Full VirusTotal Report ↗
            </a>
          </p>
        )}
      </div>
    );
  }

  const riskClass = (level) => (level || "").toLowerCase();

  return (
    <main className="app">
      <nav className="navbar">
        <div className="brand">
          <span className="brand-icon">🛡️</span>
          <span>Scam<span className="accent">Hunter</span></span>
        </div>
        <span className="status">
          <span className="status-dot"></span>
          AI PROTECTION
        </span>
      </nav>

      <section className="hero">
        <div className="eyebrow">INTELLIGENT SCAM DETECTION</div>
        <h1>Think before you <span className="gradient-text">trust.</span></h1>
        <p>
          Paste a suspicious message. Let AI inspect the warning signs before
          you click, reply, or share sensitive information.
        </p>
      </section>

      <section className="url-scanner panel">
        <div className="panel-heading">
          <div>
            <h2>URL Threat Scanner</h2>
            <p>Check a link against VirusTotal reports</p>
          </div>
          <span className="panel-icon">🔗</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            checkUrl();
          }}
        >
          <label htmlFor="url-check">WEBSITE URL</label>
          <input
            id="url-check"
            type="url"
              autoComplete="off"
            value={urlToCheck}
            onChange={(e) => setUrlToCheck(e.target.value)}
            placeholder="https://example.com"
            required
          />
          <button className="analyze-button" type="submit" disabled={urlLoading}>
            {urlLoading ? "Checking URL..." : "Check with VirusTotal"}
          </button>
        </form>

        {urlError && (
          <p role="alert" className="error-box">{urlError}</p>
        )}

        {renderUrlResult()}
      </section>

      <section className="workspace">
        <div className="panel">
          <div className="panel-heading">
            <div>
              <h2>Message Analyzer</h2>
              <p>Analyze SMS, emails, and chat messages</p>
            </div>
            <span className="panel-icon">⌁</span>
          </div>

          <div className="sample-messages">
            <span>TRY A SAMPLE</span>
            <div className="sample-buttons">
              {sampleMessages.map((sample) => (
                <button
                  key={sample.label}
                  type="button"
                  className="sample-button"
                  onClick={() => {
                    setMessage(sample.text);
                    setError("");
                    setAnalysis("");
                    setRisk(null);
                  }}
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>

          <label htmlFor="message">SUSPICIOUS MESSAGE</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Example: Congratulations! You won a prize. Share your OTP immediately..."
            rows={7}
          />

          <div className="input-footer">
            <span>{message.length} characters</span>
            <button
              type="button"
              className="clear-button"
              onClick={() => {
                setMessage("");
                setAnalysis("");
                setError("");
                setRisk(null);
              }}
            >
              Clear
            </button>
          </div>

          <button
            type="button"
            className="analyze-button"
            onClick={analyzeMessage}
            disabled={loading}
          >
            {loading ? "Analyzing message..." : "⌕  Analyze with Gemini AI"}
          </button>

          <p className="privacy-note">
            🔒 Avoid entering real passwords, OTPs, or private account details.
          </p>
        </div>

        <div className="panel results-panel">
          <div className="panel-heading">
            <div>
              <h2>Analysis Report</h2>
              <p>AI findings and safety guidance</p>
            </div>
            <span className="report-icon">✳</span>
          </div>

          {!loading && !analysis && !risk && !error && (
            <div className="empty-state">
              <div className="empty-icon">⌕</div>
              <h3>Your report will appear here</h3>
              <p>
                Submit a message to receive an AI assessment, warning signs,
                and recommended next steps.
              </p>
            </div>
          )}

          {loading && (
            <div className="empty-state">
              <div className="loader"></div>
              <h3>Inspecting message...</h3>
              <p>Gemini AI is evaluating the message context.</p>
            </div>
          )}

          {error && (
            <div className="error-box">
              <h3>Analysis unsuccessful</h3>
              <p>{error}</p>
            </div>
          )}

          {risk && (
            <div className="risk-summary">
              <div className="result-label">RULE-BASED RISK ASSESSMENT</div>
              <div className="risk-top">
                <div>
                  <div className="risk-score">
                    {risk.riskScore}<span>/100</span>
                  </div>
                  <div className="risk-caption">Risk score</div>
                </div>
                <span className={`risk-badge ${riskClass(risk.riskLevel)}`}>
                  {risk.riskLevel} RISK
                </span>
              </div>

              <div className="risk-track">
                <div
                  className={`risk-fill ${riskClass(risk.riskLevel)}`}
                  style={{ width: `${risk.riskScore}%` }}
                />
              </div>

              <h3>Warning signs detected</h3>
              {risk.warnings?.length > 0 ? (
                <ul className="warning-list">
                  {risk.warnings.map((warning, index) => (
                    <li key={index}>⚠️ {warning}</li>
                  ))}
                </ul>
              ) : (
                <p>No warning signs detected by the current rules.</p>
              )}
            </div>
          )}

          {analysis && (
            <div className="analysis-result">
              <div className="result-label">GEMINI AI ASSESSMENT</div>
              <div className="analysis-text">{analysis}</div>
              <div className="disclaimer">
                AI assessments can be wrong. Independently verify unexpected
                requests, links, and claims.
              </div>
              <button
                className="download-button"
                onClick={downloadReport}
                type="button"
              >
                ↓ Download Scan Report
              </button>
            </div>
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="history-section">
          <div className="history-heading">
            <div>
              <h2>Recent Scans</h2>
              <p>Your five most recent analyses</p>
            </div>
            <button type="button" className="clear-button" onClick={clearHistory}>
              Clear history
            </button>
          </div>

          <div className="history-filters">
            <input
              type="search"
              placeholder="Search scanned messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="ALL">All risk levels</option>
              <option value="HIGH">High risk</option>
              <option value="MEDIUM">Medium risk</option>
              <option value="LOW">Low risk</option>
            </select>
          </div>

          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <p>No scans match your search or filter.</p>
            ) : (
              filteredHistory.map((item, index) => (
                <div className="history-item" key={item.id ?? `${item.time}-${index}`}>
                  <div className="history-message">
                    <strong>{item.message}</strong>
                    <span>{item.time}</span>
                  </div>
                  <div className="history-result">
                    <span className={`risk-badge ${riskClass(item.riskLevel)}`}>
                      {item.riskLevel} RISK
                    </span>
                    <span className="history-score">{item.riskScore}/100</span>
                    <button
                      className="clear-button"
                      type="button"
                      onClick={() => viewScanDetails(item.id)}
                      disabled={!item.id}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {(detailLoading || detailError || selectedScan) && (
        <div
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <section
            className="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scan-details-title"
            style={{ width: "min(680px, 100%)", maxHeight: "85vh", overflowY: "auto" }}
          >
            <div className="panel-heading">
              <div>
                <h2 id="scan-details-title">Scan Details</h2>
                <p>Saved result from your scan history</p>
              </div>
              <button type="button" className="clear-button" onClick={closeDetails}>
                Close
              </button>
            </div>

            {detailLoading && <p>Loading scan details...</p>}
            {detailError && (
              <div className="error-box" role="alert">{detailError}</div>
            )}
            {selectedScan && (
              <div className="analysis-result">
                <p><strong>Scan ID:</strong> {selectedScan.id}</p>
                <p>
                  <strong>Scanned at:</strong>{" "}
                  {selectedScan.scannedAt
                    ? new Date(selectedScan.scannedAt).toLocaleString()
                    : "Unknown"}
                </p>
                <p><strong>Risk level:</strong> {selectedScan.riskLevel || "Unknown"}</p>
                <p>
                  <strong>Risk score:</strong>{" "}
                  {selectedScan.riskScore ?? "Unavailable"}/100
                </p>
                <h3>Analyzed message</h3>
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {selectedScan.message || "No message saved."}
                </p>
                <h3>Analysis</h3>
                <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {selectedScan.analysis || "No detailed analysis was saved for this scan."}
                </p>
              </div>
            )}
          </section>
        </div>
      )}

      <footer>
        <span>🛡️ ScamHunter AI</span>
        <span>Stay alert. Stay protected.</span>
      </footer>
    </main>
  );
}

export default App;