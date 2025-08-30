"use client";

import React, { useState, useRef } from "react";

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

  function copyText() {
    const text = account.address;
    navigator.clipboard.writeText(text);
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

  return (
    <div className="container">
      <div className="nav">
        <h1>Temp Mail Service</h1>
        <p>Discord ID : _.1tsunami</p>
        <hr />
        <p>
          Forget about spam, advertising mailings, hacking and attacking robots.
          Keep your real mailbox clean and secure. Temp Mail provides temporary,
          secure, anonymous, free, disposable email address.
        </p>
      </div>

      {!account ? (
        <div className="center">
          <button onClick={createAddress} className="gen">
            Generate Address
          </button>
        </div>
      ) : (
        <div className="email-button">
          <p className="email">{account.address}</p>
          <button onClick={copyText} className="copy">
            Copy
          </button>
          <button className="refresh" onClick={fetchMessages}>
            Refresh
          </button>
          <button onClick={deleteAddress} className="delete">
            Delete
          </button>
        </div>
      )}

      {account && (
        <div className="inbox-section">
          <h2 className="inbox">Inbox</h2>
          {messages.length === 0 && <p className="notext">No messages</p>}
          <ul className="msg-list">
            {messages.map((m) => (
              <li
                key={m.id}
                onClick={() => loadMessage(m.id)}
                className="msg-item"
              >
                <strong>{m.from?.address}</strong> - {m.subject}
              </li>
            ))}
          </ul>

          <h2 className="msg">Message</h2>
          {!selected && <p className="notext">Select a message</p>}
          {selected && (
            <div className="semail">
              <p>
                <strong>From:</strong> {selected.from?.address}
              </p>
              <p>
                <strong>Subject:</strong> {selected.subject}
              </p>
              <div
                dangerouslySetInnerHTML={{
                  __html: selected.html || selected.text,
                }}
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}
