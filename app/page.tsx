"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [greeting, setGreeting] = useState("早上好");
  const [weather, setWeather] = useState("London · 9°C · 多云");

  const [brief, setBrief] = useState("今日总结生成中…");
  const [reply, setReply] = useState("今天想让我先处理什么？");

  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const hour = now.getHours();

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

      if (hour < 5) setGreeting("深夜了");
      else if (hour < 12) setGreeting("早上好");
      else if (hour < 18) setGreeting("下午好");
      else setGreeting("晚上好");
    }

    async function loadDashboard() {
      try {
        const weatherRes = await fetch("/api/weather");
        const weatherData = await weatherRes.json();

        setWeather(
          `${weatherData.city || "London"} · ${
            weatherData.temperature || "?"
          }°C · ${weatherData.weather || "天气更新中"}`
        );

        const briefRes = await fetch("/api/brief");
        const briefData = await briefRes.json();

        setBrief(briefData.summary || "今日总结暂时无法生成。");
      } catch {
        setBrief("今日总结暂时无法生成。");
      }
    }

    updateClock();
    loadDashboard();

    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

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

    setMessage("");
    setLoading(false);
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

    setMessage("");
    setLoading(false);
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

    setMessage("");
    setLoading(false);
  }

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

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);

      audio.play();
    } catch {
      setSpeaking(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setRecording(false);
        setTranscribing(true);

        const audioBlob = new Blob(chunksRef.current, {
          type: "audio/webm",
        });

        const formData = new FormData();
        formData.append("audio", audioBlob, "voice.webm");

        try {
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();

          if (data.text) {
            setMessage(data.text);
          } else {
            setReply("没有识别到语音内容。");
          }
        } catch {
          setReply("语音转文字失败。");
        }

        setTranscribing(false);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecording(true);
    } catch {
      setReply("无法打开麦克风，请检查浏览器权限。");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
    }
  }

  return (
    <main style={styles.page}>
      <div style={styles.bgGlow} />

      <section style={styles.content}>
        <div style={styles.top}>
          <div style={styles.time}>{time}</div>
          <div style={styles.meta}>{date}</div>
          <div style={styles.meta}>{weather}</div>
        </div>

        <div style={styles.greetingBlock}>
          <div style={styles.greeting}>{greeting}</div>
          <div style={styles.status}>sana 已在线。</div>
        </div>

        <section style={styles.card}>
          <div style={styles.cardTop}>
            <div style={styles.label}>今日总结</div>
            <button onClick={() => speakText(brief)} style={styles.voicePill}>
              {speaking ? "朗读中" : "Voice"}
            </button>
          </div>

          <div style={styles.briefText}>{brief}</div>
        </section>

        <section style={styles.card}>
          <div style={styles.label}>sana</div>

          <div style={styles.replyText}>
            {loading ? "sana 正在处理…" : reply}
          </div>

          <div style={styles.intentRow}>
            <button onClick={summarizeEmails} style={styles.intentButton}>
              ○ 邮件
            </button>
            <button onClick={generateTasks} style={styles.intentButton}>
              ○ 待办
            </button>
            <button onClick={generateCalendar} style={styles.intentButton}>
              ○ 日程
            </button>
          </div>
        </section>
      </section>

      <section style={styles.inputDock}>
        {menuOpen && (
          <div style={styles.quickPanel}>
            <button onClick={summarizeEmails} style={styles.quickButton}>
              ○ 总结邮件
            </button>
            <button onClick={generateTasks} style={styles.quickButton}>
              ○ 生成待办
            </button>
            <button onClick={generateCalendar} style={styles.quickButton}>
              ○ 识别日程
            </button>
          </div>
        )}

        {(recording || transcribing) && (
          <div style={styles.listenPanel}>
            <span style={styles.listenOrb} />
            {recording ? "正在听你说话…" : "正在转成文字…"}
          </div>
        )}

        <div style={styles.inputRow}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={styles.plusButton}
          >
            {menuOpen ? "×" : "+"}
          </button>

          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              recording
                ? "正在听…"
                : transcribing
                ? "正在识别…"
                : "问 sana…"
            }
            style={styles.input}
          />

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            style={{
              ...styles.micButton,
              ...(recording ? styles.micButtonActive : {}),
            }}
          >
            {recording ? "◌" : "⌁"}
          </button>

          <button
            onClick={sendMessage}
            disabled={!message.trim() || loading}
            style={{
              ...styles.sendButton,
              opacity: message.trim() ? 1 : 0.35,
            }}
          >
            发送
          </button>
        </div>
      </section>
    </main>
  );
}

const glass = {
  background: "rgba(255,255,255,0.055)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "100dvh",
    overflow: "hidden",
    background: "#050505",
    color: "white",
    position: "relative",
    fontFamily:
      "-apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC',sans-serif",
  },

  bgGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 20% 0%, rgba(90,100,170,0.22), transparent 38%), radial-gradient(circle at 90% 20%, rgba(80,150,180,0.08), transparent 32%), #050505",
  },

  content: {
    position: "relative",
    zIndex: 1,
    height: "100%",
    overflowY: "auto",
    paddingLeft: 22,
    paddingRight: 22,
    paddingTop: "max(env(safe-area-inset-top), 30px)",
    paddingBottom: 190,
  },

  top: {
    marginTop: 8,
  },

  time: {
    fontSize: "clamp(72px, 20vw, 104px)",
    fontWeight: 900,
    letterSpacing: -7,
    lineHeight: 0.9,
  },

  meta: {
    marginTop: 10,
    color: "rgba(255,255,255,0.62)",
    fontSize: 18,
    fontWeight: 600,
  },

  greetingBlock: {
    marginTop: 58,
  },

  greeting: {
    fontSize: "clamp(44px, 12vw, 66px)",
    fontWeight: 900,
    letterSpacing: -3,
    lineHeight: 1,
  },

  status: {
    marginTop: 14,
    color: "rgba(255,255,255,0.55)",
    fontSize: 22,
    fontWeight: 700,
  },

  card: {
    ...glass,
    marginTop: 26,
    borderRadius: 34,
    padding: 24,
    boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
  },

  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  label: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 15,
    fontWeight: 700,
  },

  voicePill: {
    ...glass,
    color: "white",
    borderRadius: 999,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 700,
  },

  briefText: {
    marginTop: 24,
    fontSize: "clamp(22px, 6vw, 30px)",
    lineHeight: 1.35,
    fontWeight: 800,
    whiteSpace: "pre-wrap",
  },

  replyText: {
    marginTop: 18,
    fontSize: "clamp(21px, 5.6vw, 30px)",
    lineHeight: 1.45,
    fontWeight: 760,
    whiteSpace: "pre-wrap",
  },

  intentRow: {
    marginTop: 26,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  intentButton: {
    ...glass,
    borderRadius: 999,
    padding: "11px 17px",
    color: "white",
    fontSize: 15,
    fontWeight: 700,
  },

  inputDock: {
    position: "fixed",
    zIndex: 10,
    left: 14,
    right: 14,
    bottom: "max(env(safe-area-inset-bottom), 14px)",
    borderRadius: 34,
    padding: 12,
    background: "rgba(12,12,14,0.86)",
    backdropFilter: "blur(34px)",
    WebkitBackdropFilter: "blur(34px)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 -24px 80px rgba(0,0,0,0.55)",
  },

  quickPanel: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 10,
  },

  quickButton: {
    ...glass,
    whiteSpace: "nowrap",
    color: "white",
    borderRadius: 999,
    padding: "10px 15px",
    fontSize: 14,
    fontWeight: 700,
  },

  listenPanel: {
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 22,
    padding: "12px 14px",
    background:
      "linear-gradient(135deg, rgba(150,140,255,0.18), rgba(90,170,255,0.08))",
    border: "1px solid rgba(160,150,255,0.22)",
    color: "rgba(230,232,255,0.95)",
    fontWeight: 700,
  },

  listenOrb: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "rgba(180,175,255,0.95)",
    boxShadow: "0 0 22px rgba(150,140,255,0.8)",
  },

  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
  },

  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontSize: 28,
    fontWeight: 500,
    flexShrink: 0,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.045)",
    color: "white",
    outline: "none",
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 17,
    fontWeight: 650,
  },

  micButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "white",
    fontSize: 22,
    fontWeight: 800,
    flexShrink: 0,
  },

  micButtonActive: {
    border: "1px solid rgba(165,155,255,0.7)",
    background:
      "radial-gradient(circle, rgba(150,140,255,0.32), rgba(255,255,255,0.06))",
    boxShadow: "0 0 30px rgba(140,130,255,0.4)",
  },

  sendButton: {
    height: 52,
    borderRadius: 18,
    border: "none",
    background: "white",
    color: "black",
    paddingLeft: 17,
    paddingRight: 17,
    fontSize: 16,
    fontWeight: 800,
    flexShrink: 0,
  },
};