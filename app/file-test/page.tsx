"use client";

import { useState } from "react";

export default function FileTest() {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  async function uploadFile(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/read-file", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setSummary(data.summary);
    setLoading(false);
  }

  return (
    <main style={{ padding: 40, background: "#0a0a0a", color: "white", minHeight: "100vh" }}>
      <h1>文件读取测试</h1>

      <input type="file" onChange={uploadFile} />

      <div style={{ marginTop: 30, whiteSpace: "pre-wrap", lineHeight: 1.8 }}>
        {loading ? "sana 正在读取文件..." : summary}
      </div>
    </main>
  );
}