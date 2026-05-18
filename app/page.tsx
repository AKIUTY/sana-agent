"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [greeting, setGreeting] = useState("");

  const [weather, setWeather] = useState("天气加载中...");
  const [todayBrief, setTodayBrief] = useState("今日总结生成中...");

  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hour = now.getHours();

      if (hour < 5) setGreeting("深夜了");
      else if (hour < 12) setGreeting("早上好");
      else if (hour < 18) setGreeting("下午好");
      else setGreeting("晚上好");

      setTime(
        now.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      setDate(
        now.toLocaleDateString("zh-CN", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })
      );
    }

    async function loadDashboard() {
      try {
        const weatherRes = await fetch("/api/weather");
        const weatherData = await weatherRes.json();

        setWeather(
          `${weatherData.city} · ${weatherData.temperature}°C · ${weatherData.weather}`
        );

        const briefRes = await fetch("/api/brief");
        const briefData = await briefRes.json();

        setTodayBrief(briefData.summary || "今日总结暂时无法生成。");
      } catch {
        setTodayBrief("今日总结暂时无法生成。");
      }
    }

    updateClock();
    loadDashboard();

    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  async function speakText(text: string) {
    if (!text.trim()) return;

    setSpeaking(true);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => setSpeaking(false);
      audio.play();
    } catch {
      setSpeaking(false);
    }
  }

  async function sendMessage() {
    if (!message.trim()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setReply(data.reply);
    } catch {
      setReply("sana 当前无法连接。");
    }

    setLoading(false);
    setMessage("");
  }

  async function summarizeEmails() {
    setLoading(true);

    try {
      const res = await fetch("/api/summary");
      const data = await res.json();

      setReply(data.summary);
    } catch {
      setReply("无法读取邮件。");
    }

    setLoading(false);
  }

  async function generateTasks() {
    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message || "根据今天的邮件和当前情况生成待办。",
        }),
      });

      const data = await res.json();
      setReply(data.tasks || "今天暂无待办事项。");
    } catch {
      setReply("今日待办生成失败。");
    }

    setLoading(false);
    setMessage("");
  }

  async function generateCalendar() {
    if (!message.trim()) {
      setReply("请先输入一段包含时间或事件的信息，例如：明天下午三点开会。");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
        }),
      });

      const data = await res.json();
      setReply(data.calendar || "暂时没有识别到日程。");
    } catch {
      setReply("日程生成失败。");
    }

    setLoading(false);
    setMessage("");
  }

  const currentText = reply || todayBrief;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "white",
        padding: "40px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif",
      }}
    >
      <div style={{ maxWidth: "920px", margin: "0 auto" }}>
        <div style={{ marginBottom: "42px" }}>
          <div
            style={{
              fontSize: "76px",
              fontWeight: 600,
              letterSpacing: "-4px",
              lineHeight: 1,
            }}
          >
            {time}
          </div>

          <div style={{ marginTop: "10px", color: "#787878", fontSize: "17px" }}>
            {date}
          </div>

          <div style={{ marginTop: "6px", color: "#8d8d8d", fontSize: "14px" }}>
            {weather}
          </div>
        </div>

        <div style={{ marginBottom: "36px" }}>
          <div
            style={{
              fontSize: "42px",
              fontWeight: 600,
              letterSpacing: "-1px",
              marginBottom: "10px",
            }}
          >
            {greeting}
          </div>

          <div
            style={{
              color: "#9b9b9b",
              fontSize: "16px",
              lineHeight: "1.9",
              fontWeight: 400,
            }}
          >
            sana 已在线。
          </div>
        </div>

        <div
          style={{
            background: "#111",
            border: "1px solid #1d1d1d",
            borderRadius: "28px",
            padding: "28px",
            marginBottom: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <div style={{ color: "#777", fontSize: "13px" }}>今日总结</div>

            <button
              onClick={() => speakText(todayBrief)}
              style={{
                background: "transparent",
                border: "1px solid #2a2a2a",
                color: speaking ? "#ffffff" : "#9a9a9a",
                padding: "8px 13px",
                borderRadius: "999px",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {speaking ? "Speaking" : "Voice"}
            </button>
          </div>

          <div
            style={{
              color: "#e5e5e5",
              lineHeight: "2",
              whiteSpace: "pre-wrap",
              fontSize: "15px",
            }}
          >
            {todayBrief}
          </div>
        </div>

        <div
          style={{
            background: "#111",
            border: "1px solid #1d1d1d",
            borderRadius: "28px",
            padding: "28px",
            minHeight: "220px",
            marginBottom: "20px",
            lineHeight: "1.9",
            whiteSpace: "pre-wrap",
            color: "#ececec",
            fontSize: "15px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "14px",
            }}
          >
            <div style={{ color: "#777", fontSize: "13px" }}>sana</div>

            {reply && (
              <button
                onClick={() => speakText(currentText)}
                style={{
                  background: "transparent",
                  border: "1px solid #2a2a2a",
                  color: speaking ? "#ffffff" : "#9a9a9a",
                  padding: "8px 13px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {speaking ? "Speaking" : "Voice"}
              </button>
            )}
          </div>

          {loading ? "sana 正在处理..." : reply || "今天想让我先处理什么？"}
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            background: "#111",
            border: "1px solid #1d1d1d",
            borderRadius: "24px",
            padding: "12px",
          }}
        >
          <button
            onClick={summarizeEmails}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "white",
              padding: "0 16px",
              borderRadius: "16px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            邮件
          </button>

          <button
            onClick={generateTasks}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "white",
              padding: "0 16px",
              borderRadius: "16px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            待办
          </button>

          <button
            onClick={generateCalendar}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              color: "white",
              padding: "0 16px",
              borderRadius: "16px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            日程
          </button>

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="问 sana，或输入计划、邮件、日程..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "white",
              padding: "14px",
              fontSize: "15px",
              minWidth: 0,
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              background: "white",
              color: "black",
              border: "none",
              padding: "14px 22px",
              borderRadius: "16px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            发送
          </button>
        </div>
      </div>
    </main>
  );
}