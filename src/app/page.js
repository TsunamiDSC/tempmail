"use client";

import React, { useEffect, useState, useRef } from "react";

const API_BASE = "https://api.mail.tm";

function randStr(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++)
    s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export default function Home() {
  const [account, setAccount] = useState(null);
  const [token, setToken] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function createAddress() {
    setError(null);
    try {
      const domRes = await fetch(API_BASE + "/domains");
      const domJson = await domRes.json();
      const domain = domJson["hydra:member"]?.[0]?.domain || "mail.tm";

      const local = randStr(10);
      const address = `${local}@${domain}`;
      const password = randStr(12);

      const r = await fetch(API_BASE + "/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, password }),
      });
      const j = await r.json();
      if (r.status >= 400)
        throw new Error(j["hydra:description"] || "Failed to create account");

      setAccount({ id: j.id, address: j.address || address, password });
      await login(address, password);

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => fetchMessages(), 4000);
    } catch (e) {
      setError(String(e));
    }
  }

  async function login(address, password) {
    try {
      const r = await fetch(API_BASE + "/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, password }),
      });
      const j = await r.json();
      if (r.status >= 400) throw new Error(j.message || "Auth error");
      setToken(j.token);
      return j.token;
    } catch (e) {
      setError(String(e));
    }
  }

  async function fetchMessages() {
    if (!token) return;
    try {
      const r = await fetch(API_BASE + "/messages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      setMessages(j["hydra:member"] || []);
    } catch (e) {
      console.warn(e);
    }
  }

  async function loadMessage(id) {
    if (!token) return;
    try {
      const r = await fetch(API_BASE + "/messages/" + id, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      setSelected(j);
    } catch (e) {
      console.warn(e);
    }
  }

  async function deleteAddress() {
    if (!account || !token) return;
    try {
      await fetch(API_BASE + "/accounts/" + account.id, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (e) {
      console.warn(e);
    }
    setAccount(null);
    setToken(null);
    setMessages([]);
    setSelected(null);
    if (pollRef.current) clearInterval(pollRef.current);
  }

  function copyToClipboard(v) {
    navigator.clipboard.writeText(v);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Temp Mail Clone (Next.js)</h1>

        {!account ? (
          <button
            onClick={createAddress}
            className="px-4 py-2 rounded bg-indigo-600 text-white"
          >
            Generate Address
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="break-all font-mono">{account.address}</div>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => copyToClipboard(account.address)}
                className="px-3 py-1 border rounded"
              >
                Copy
              </button>
              <button
                onClick={fetchMessages}
                className="px-3 py-1 border rounded"
              >
                Refresh
              </button>
              <button
                onClick={deleteAddress}
                className="px-3 py-1 border rounded text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="md:col-span-1 border rounded p-3 h-64 overflow-y-auto">
            <h2 className="font-semibold mb-2">Inbox</h2>
            {messages.map((m) => (
              <div
                key={m.id}
                onClick={() => loadMessage(m.id)}
                className="p-2 hover:bg-gray-100 rounded cursor-pointer"
              >
                <div className="text-sm font-medium">{m.from?.address}</div>
                <div className="text-xs text-gray-600 truncate">
                  {m.subject}
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-2 border rounded p-3 h-64 overflow-y-auto">
            <h2 className="font-semibold mb-2">Message</h2>
            {!selected && (
              <div className="text-sm text-gray-500">Select a message</div>
            )}
            {selected && (
              <div>
                <div className="mb-2">
                  <strong>From:</strong> {selected.from?.address}
                </div>
                <div className="mb-2">
                  <strong>Subject:</strong> {selected.subject}
                </div>
                <div
                  dangerouslySetInnerHTML={{
                    __html: selected.html || selected.text,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>
    </main>
  );
}
