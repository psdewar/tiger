"use client";
import { useState } from "react";

const API_BASE = typeof window !== "undefined" ? window.location.origin : "";
type TestResult = { status: number; data: unknown; time: number } | null;

export default function Home() {
  const [appKey, setAppKey] = useState("");
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  async function runTest(id: string, fn: () => Promise<Response>) {
    setLoading((l) => ({ ...l, [id]: true }));
    const start = Date.now();
    try {
      const res = await fn();
      const data = await res.json();
      setResults((r) => ({ ...r, [id]: { status: res.status, data, time: Date.now() - start } }));
    } catch (e) {
      setResults((r) => ({ ...r, [id]: { status: 0, data: { error: String(e) }, time: Date.now() - start } }));
    }
    setLoading((l) => ({ ...l, [id]: false }));
  }

  const tests = [
    {
      id: "health",
      name: "GET /api/health",
      desc: "Health check (no auth)",
      run: () => fetch(`${API_BASE}/api/health`),
    },
    {
      id: "checkout-noauth",
      name: "POST /api/checkout (no auth)",
      desc: "Should return 401",
      run: () => fetch(`${API_BASE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
    },
    {
      id: "checkout-badkey",
      name: "POST /api/checkout (bad key)",
      desc: "Should return 403",
      run: () => fetch(`${API_BASE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer invalid" }, body: "{}" }),
    },
    {
      id: "checkout-noproduct",
      name: "POST /api/checkout (missing productId)",
      desc: "Should return 400",
      run: () => fetch(`${API_BASE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${appKey}` }, body: JSON.stringify({ successUrl: "https://example.com/success", cancelUrl: "https://example.com/cancel" }) }),
    },
    {
      id: "checkout-unknown",
      name: "POST /api/checkout (unknown product)",
      desc: "Should return 404",
      run: () => fetch(`${API_BASE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${appKey}` }, body: JSON.stringify({ productId: "unknown:product", successUrl: "https://example.com/success", cancelUrl: "https://example.com/cancel" }) }),
    },
    {
      id: "checkout-valid",
      name: "POST /api/checkout (lyrist:monthly)",
      desc: "Should return 200 with sessionId and url (requires valid Stripe price)",
      run: () => fetch(`${API_BASE}/api/checkout`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${appKey}` }, body: JSON.stringify({ productId: "lyrist:monthly", successUrl: "https://example.com/success", cancelUrl: "https://example.com/cancel", userId: "test_user_123" }) }),
    },
    {
      id: "session-noauth",
      name: "GET /api/session/:id (no auth)",
      desc: "Should return 401",
      run: () => fetch(`${API_BASE}/api/session/cs_test_123`),
    },
    {
      id: "session-notfound",
      name: "GET /api/session/:id (invalid session)",
      desc: "Should return 404",
      run: () => fetch(`${API_BASE}/api/session/cs_test_invalid`, { headers: { Authorization: `Bearer ${appKey}` } }),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Tiger API Test Console</h1>
      <p style={{ color: "#888", marginBottom: 24 }}>Test endpoints against your local or deployed instance</p>
      <div style={{ marginBottom: 24, padding: 16, background: "#222", borderRadius: 8 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>APP_KEY (from env)</label>
        <input
          type="text"
          value={appKey}
          onChange={(e) => setAppKey(e.target.value)}
          placeholder="Enter your APP_KEY secret"
          style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #444", background: "#111", color: "#eee", fontSize: 14, boxSizing: "border-box" }}
        />
        <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>Format in env: APP_KEYS=appname:secretkey — enter just the secretkey part</p>
      </div>
      <h2 style={{ marginBottom: 16 }}>Endpoints</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Endpoint</th>
            <th style={{ textAlign: "left", padding: 8 }}>Expected</th>
            <th style={{ textAlign: "center", padding: 8, width: 100 }}>Action</th>
            <th style={{ textAlign: "center", padding: 8, width: 80 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #222" }}>
              <td style={{ padding: 8 }}>
                <code style={{ background: "#333", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>{t.name}</code>
              </td>
              <td style={{ padding: 8, color: "#888", fontSize: 13 }}>{t.desc}</td>
              <td style={{ padding: 8, textAlign: "center" }}>
                <button
                  onClick={() => runTest(t.id, t.run)}
                  disabled={loading[t.id]}
                  style={{ padding: "6px 12px", borderRadius: 4, border: "none", background: "#3b82f6", color: "#fff", cursor: "pointer", fontSize: 13 }}
                >
                  {loading[t.id] ? "..." : "Run"}
                </button>
              </td>
              <td style={{ padding: 8, textAlign: "center" }}>
                {results[t.id] && (
                  <span style={{ color: results[t.id]!.status >= 200 && results[t.id]!.status < 300 ? "#22c55e" : results[t.id]!.status >= 400 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>
                    {results[t.id]!.status} ({results[t.id]!.time}ms)
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {Object.entries(results).filter(([, v]) => v).length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ marginBottom: 16 }}>Results</h2>
          {Object.entries(results).filter(([, v]) => v).map(([id, r]) => (
            <div key={id} style={{ marginBottom: 16, padding: 12, background: "#222", borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{tests.find((t) => t.id === id)?.name}</div>
              <pre style={{ margin: 0, fontSize: 12, overflow: "auto", color: "#aaa" }}>{JSON.stringify(r?.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
