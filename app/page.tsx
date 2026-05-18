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
  const [menuOpen, setMenuOpen] = useState(false);

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
          month: "long",
          day: "numeric",
          weekday: "long",
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
    setMenuOpen(false);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setReply(data.reply || "sana 没有返回内容。");
    } catch {
      setReply("sana 当前无法连接。");
    }

    setLoading(false);
    setMessage("");
  }

  async function summarizeEmails() {
    setLoading(true);
    setMenuOpen(false);

    try {
      const res = await fetch("/api/summary");
      const data = await res.json();

      setReply(data.summary || "没有读取到邮件总结。");
    } catch {
      setReply("无法读取邮件。");
    }

    setLoading(false);
  }

  async function generateTasks() {
    setLoading(true);
    setMenuOpen(false);

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
      setReply("先输入一段日程，例如：明天下午三点开会。");
      setMenuOpen(false);
      return;
    }

    setLoading(true);
    setMenuOpen(false);

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: message }),
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
        background:
          "radial-gradient(circle at top left, #1a1a1a 0%, #090909 42%, #050505 100%)",
        color: "white",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif",
        padding: "clamp(22px, 5vw, 46px)",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
        }}
      >
        <section
          style={{
            marginBottom: "clamp(36px, 8vw, 70px)",
          }}
        >
          <div
            style={{
              fontSize: "clamp(58px, 17vw, 96px)",
              fontWeight: 650,
              letterSpacing: "-0.07em",
              lineHeight: 0.92,
            }}
          >
            {time}
          </div>

          <div
            style={{
              marginTop: "14px",
              color: "#8d8d8d",
              fontSize: "clamp(14px, 3.5vw, 17px)",
            }}
          >
            {date}
          </div>

          <div
            style={{
              marginTop: "8px",
              color: "#a0a0a0",
              fontSize: "clamp(13px, 3.2vw, 15px)",
            }}
          >
            {weather}
          </div>
        </section>

        <section
          style={{
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "clamp(36px, 9vw, 52px)",
              fontWeight: 620,
              letterSpacing: "-0.04em",
              marginBottom: "12px",
            }}
          >
            {greeting}
          </div>

          <div
            style={{
              color: "#9b9b9b",
              fontSize: "clamp(15px, 3.5vw, 17px)",
              lineHeight: 1.8,
            }}
          >
            sana 已在线。
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "30px",
            padding: "clamp(22px, 5vw, 30px)",
            marginBottom: "18px",
            backdropFilter: "blur(18px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "18px",
            }}
          >
            <div
              style={{
                color: "#8e8e8e",
                fontSize: "13px",
              }}
            >
              今日总结
            </div>

            <button
              onClick={() => speakText(todayBrief)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: speaking ? "#ffffff" : "#a7a7a7",
                padding: "8px 14px",
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
              color: "#eeeeee",
              lineHeight: 1.95,
              whiteSpace: "pre-wrap",
              fontSize: "clamp(14px, 3.5vw, 15px)",
            }}
          >
            {todayBrief}
          </div>
        </section>

        <section
          style={{
            background: "rgba(255,255,255,0.055)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "30px",
            padding: "clamp(22px, 5vw, 30px)",
            minHeight: "210px",
            marginBottom: "20px",
            backdropFilter: "blur(18px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                color: "#8e8e8e",
                fontSize: "13px",
              }}
            >
              sana
            </div>

            {reply && (
              <button
                onClick={() => speakText(currentText)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: speaking ? "#ffffff" : "#a7a7a7",
                  padding: "8px 14px",
                  borderRadius: "999px",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {speaking ? "Speaking" : "Voice"}
              </button>
            )}
          </div>

          <div
            style={{
              lineHeight: 1.9,
              whiteSpace: "pre-wrap",
              color: "#f0f0f0",
              fontSize: "clamp(14px, 3.5vw, 15px)",
            }}
          >
            {loading ? "sana 正在处理..." : reply || "今天想让我先处理什么？"}
          </div>
        </section>

        <section
          style={{
            position: "sticky",
            bottom: "18px",
            background: "rgba(18,18,18,0.92)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "26px",
            padding: "12px",
            backdropFilter: "blur(22px)",
          }}
        >
          {menuOpen && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
                marginBottom: "12px",
              }}
            >
              <button onClick={summarizeEmails} style={actionStyle}>
                邮件
              </button>
              <button onClick={generateTasks} style={actionStyle}>
                待办
              </button>
              <button onClick={generateCalendar} style={actionStyle}>
                日程
              </button>
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: menuOpen ? "white" : "rgba(255,255,255,0.07)",
                color: menuOpen ? "black" : "white",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              {menuOpen ? "×" : "+"}
            </button>

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="问 sana，或输入计划、邮件、日程..."
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                padding: "14px 4px",
                fontSize: "15px",
              }}
            />

            <button
              onClick={sendMessage}
              style={{
                background: "white",
                color: "black",
                border: "none",
                padding: "14px 20px",
                borderRadius: "16px",
                fontWeight: 560,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              发送
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

const actionStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "white",
  padding: "13px 0",
  borderRadius: "16px",
  cursor: "pointer",
  fontSize: "14px",
};