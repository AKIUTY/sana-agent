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
  const [listening, setListening] = useState(false);
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
          `${weatherData.city || "London"} · ${weatherData.temperature || "?"}°C · ${
            weatherData.weather || "天气更新中"
          }`
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
      audio.onerror = () => setSpeaking(false);
      audio.play();
    } catch {
      setSpeaking(false);
    }
  }

  function startVoiceInput() {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      setReply("当前浏览器不支持语音输入。建议用 iPhone Safari 或 Chrome。");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "zh-CN";
    recognition.interimResults = true;
    recognition.continuous = false;

    setListening(true);
    setMessage("");

    recognition.onresult = (event: any) => {
      let text = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }

      setMessage(text);
    };

    recognition.onerror = () => {
      setListening(false);
      setReply("语音识别失败，可以再试一次。");
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
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
        minHeight: "100dvh",
        overflowX: "hidden",
        background:
          "radial-gradient(circle at 20% 0%, rgba(80,90,140,0.18), transparent 34%), linear-gradient(180deg, #101010 0%, #050505 100%)",
        color: "white",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, SF Pro Display, Inter, sans-serif",
        padding: "clamp(18px, 4vw, 36px)",
        paddingBottom: "calc(150px + env(safe-area-inset-bottom))",
      }}
    >
      <div style={{ maxWidth: "920px", margin: "0 auto" }}>
        <section style={{ marginBottom: "34px" }}>
          <div
            style={{
              fontSize: "clamp(66px, 20vw, 108px)",
              fontWeight: 700,
              letterSpacing: "-0.08em",
              lineHeight: 0.9,
            }}
          >
            {time}
          </div>

          <div style={mutedText}>{date}</div>
          <div style={{ ...mutedText, marginTop: "8px" }}>{weather}</div>
        </section>

        <section style={{ marginBottom: "34px" }}>
          <div
            style={{
              fontSize: "clamp(42px, 11vw, 58px)",
              fontWeight: 650,
              letterSpacing: "-0.05em",
            }}
          >
            {greeting}
          </div>

          <div style={{ ...mutedText, marginTop: "14px" }}>sana 已在线。</div>
        </section>

        <Card>
          <Row>
            <Label>今日总结</Label>

            <button
              onClick={() => speakText(todayBrief)}
              style={smallVoiceButton(speaking)}
            >
              {speaking ? "Speaking" : "Voice"}
            </button>
          </Row>

          <div style={bodyText}>{todayBrief}</div>
        </Card>

        <Card minHeight={190}>
          <Row>
            <Label>sana</Label>

            {reply && (
              <button
                onClick={() => speakText(currentText)}
                style={smallVoiceButton(speaking)}
              >
                {speaking ? "Speaking" : "Voice"}
              </button>
            )}
          </Row>

          <div style={bodyText}>
            {loading ? "sana 正在处理..." : reply || "今天想让我先处理什么？"}
          </div>
        </Card>

        <section
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "max(12px, env(safe-area-inset-bottom))",
            width: "min(920px, calc(100vw - 28px))",
            background: "rgba(18,18,20,0.88)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "30px",
            padding: "12px",
            backdropFilter: "blur(26px)",
            WebkitBackdropFilter: "blur(26px)",
            boxShadow: "0 24px 70px rgba(0,0,0,0.48)",
            zIndex: 10,
          }}
        >
          {menuOpen && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "9px",
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
              <button onClick={startVoiceInput} style={actionStyle}>
                语音
              </button>
            </div>
          )}

          {listening && (
            <div
              style={{
                marginBottom: "12px",
                padding: "14px 16px",
                borderRadius: "22px",
                background:
                  "linear-gradient(135deg, rgba(120,110,255,0.16), rgba(90,180,255,0.08))",
                border: "1px solid rgba(150,150,255,0.2)",
                color: "#d9dcff",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={orbStyle}>✦</span>
              正在听你说话，识别后会先变成文字。
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
                width: "52px",
                height: "52px",
                borderRadius: "18px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: menuOpen ? "white" : "rgba(255,255,255,0.07)",
                color: menuOpen ? "black" : "white",
                fontSize: "28px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {menuOpen ? "×" : "+"}
            </button>

            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={listening ? "正在识别语音..." : "问 sana，或输入计划、邮件、日程..."}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "white",
                padding: "14px 4px",
                fontSize: "16px",
              }}
            />

            <button
              onClick={startVoiceInput}
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "18px",
                border: listening
                  ? "1px solid rgba(160,150,255,0.75)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: listening
                  ? "radial-gradient(circle, rgba(150,140,255,0.35), rgba(90,120,255,0.12))"
                  : "rgba(255,255,255,0.07)",
                color: "white",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: listening
                  ? "0 0 28px rgba(130,120,255,0.45)"
                  : "none",
                transition: "all 0.22s ease",
              }}
            >
              {listening ? "◌" : "⌁"}
            </button>

            <button
              onClick={sendMessage}
              disabled={!message.trim() || loading}
              style={{
                background: message.trim() ? "white" : "rgba(255,255,255,0.18)",
                color: message.trim() ? "black" : "#9a9a9a",
                border: "none",
                padding: "16px 20px",
                borderRadius: "18px",
                fontWeight: 650,
                cursor: message.trim() ? "pointer" : "default",
                whiteSpace: "nowrap",
                flexShrink: 0,
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

function Card({
  children,
  minHeight,
}: {
  children: React.ReactNode;
  minHeight?: number;
}) {
  return (
    <section
      style={{
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "32px",
        padding: "clamp(22px, 5vw, 32px)",
        marginBottom: "18px",
        minHeight,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "14px",
        marginBottom: "18px",
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "#8d8d8d", fontSize: "14px", fontWeight: 600 }}>
      {children}
    </div>
  );
}

const mutedText: React.CSSProperties = {
  marginTop: "16px",
  color: "#9d9d9d",
  fontSize: "clamp(15px, 4vw, 18px)",
  fontWeight: 560,
};

const bodyText: React.CSSProperties = {
  color: "#f2f2f2",
  lineHeight: 1.9,
  whiteSpace: "pre-wrap",
  fontSize: "clamp(15px, 4vw, 17px)",
  fontWeight: 560,
};

const actionStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "white",
  padding: "13px 0",
  borderRadius: "16px",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 650,
};

const orbStyle: React.CSSProperties = {
  width: "26px",
  height: "26px",
  borderRadius: "999px",
  display: "grid",
  placeItems: "center",
  color: "#ffffff",
  background: "rgba(140,140,255,0.18)",
  boxShadow: "0 0 22px rgba(130,120,255,0.45)",
};

function smallVoiceButton(active: boolean): React.CSSProperties {
  return {
    background: active
      ? "rgba(140,140,255,0.16)"
      : "rgba(255,255,255,0.06)",
    border: active
      ? "1px solid rgba(160,150,255,0.45)"
      : "1px solid rgba(255,255,255,0.12)",
    color: active ? "#ffffff" : "#b6b6b6",
    padding: "9px 15px",
    borderRadius: "999px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 650,
    boxShadow: active ? "0 0 22px rgba(130,120,255,0.28)" : "none",
  };
}