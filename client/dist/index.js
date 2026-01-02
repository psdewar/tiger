"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTigerClient = createTigerClient;
function createTigerClient(config) {
    const baseUrl = (config.baseUrl || "https://tiger.vercel.app").replace(/\/$/, "");
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.appKey}`,
    };
    return {
        async checkout(request) {
            const res = await fetch(`${baseUrl}/api/checkout`, {
                method: "POST",
                headers,
                body: JSON.stringify(request),
            });
            if (!res.ok) {
                const error = (await res.json().catch(() => ({ error: "Unknown error" })));
                throw new Error(error.error || `Tiger checkout failed: ${res.status}`);
            }
            return res.json();
        },
        async getSession(sessionId) {
            const res = await fetch(`${baseUrl}/api/session/${sessionId}`, { headers });
            if (!res.ok) {
                const error = (await res.json().catch(() => ({ error: "Unknown error" })));
                throw new Error(error.error || `Tiger session fetch failed: ${res.status}`);
            }
            return res.json();
        },
    };
}
