"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [greeting, setGreeting] = useState("早上好");
  const [weather, setWeather] = useState("London · 9°C · 多云");

  const [brief, setBrief] = useState("今日总结生成中…");
  const [reply, setReply] = useState("今天想让我先处理什么？");

  const [daySchedule, setDaySchedule] = useState("");
  const [fitness, setFitness] = useState<any>(null);
  const [whoop, setWhoop] = useState<any>(null);

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

        const fitnessRes = await fetch("/api/fitness");
        setFitness(await fitnessRes.json());

        const whoopRes = await fetch("/api/whoop");
        setWhoop(await whoopRes.json());

        const dayRes = await fetch("/api/day");
        const dayData = await dayRes.json();
        if (dayData.schedule) setDaySchedule(dayData.schedule);
      } catch {
        setBrief("今日总结暂时无法生成。");
      }
    }

    const params = new URLSearchParams(window.location.search);
    const whoopStatus = params.get("whoop");
    if (whoopStatus === "connected") {
      setReply("WHOOP 已连接。之后我会按你的恢复度和睡眠建议来排训练和作息。");
    } else if (whoopStatus === "missing_client") {
      setReply("还没配置 WHOOP 应用凭证（WHOOP_CLIENT_ID），连不了。");
    } else if (whoopStatus) {
      setReply("WHOOP 连接没成功，回头再试一次。");
    }
    if (whoopStatus) {
      window.history.replaceState({}, "", "/");
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
      setReply(data.reply || "经纪人没有返回内容。");
    } catch {
      setReply("经纪人当前无法连接。");
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

  async function planDay() {
    setLoading(true);
    setMenuOpen(false);

    try {
      const res = await fetch("/api/day", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: message }),
      });

      const data = await res.json();
      setDaySchedule(data.schedule || "今日行程生成失败。");
    } catch {
      setDaySchedule("今日行程生成失败。");
    }

    setMessage("");
    setLoading(false);
  }

  async function fitnessCheckin() {
    setLoading(true);
    setMenuOpen(false);

    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "checkin", note: message }),
      });

      const data = await res.json();
      setReply(data.reply || "打卡失败。");
      if (data.success) setFitness(data);
    } catch {
      setReply("打卡失败。");
    }

    setMessage("");
    setLoading(false);
  }

  async function logWeight() {
    if (!message.trim()) {
      setReply("先在输入框里写今天的体重，例如 72.5。");
      setMenuOpen(false);
      return;
    }

    setLoading(true);
    setMenuOpen(false);

    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "weight", kg: message }),
      });

      const data = await res.json();
      setReply(data.reply || "体重记录失败。");
      if (data.success) setFitness(data);
    } catch {
      setReply("体重记录失败。");
    }

    setMessage("");
    setLoading(false);
  }

  async function coachReview() {
    setLoading(true);
    setMenuOpen(false);

    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "coach" }),
      });

      const data = await res.json();
      setReply(data.reply || "教练暂时没空。");
      if (data.success) setFitness(data);
    } catch {
      setReply("教练暂时没空。");
    }

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
    // Guard against Android/Samsung firing touchstart + synthetic mousedown,
    // which would open two microphone streams.
    if (recording || mediaRecorderRef.current?.state === "recording") return;

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
          <div style={styles.status}>经纪人已上线。</div>
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
          <div style={styles.cardTop}>
            <div style={styles.label}>今日行程</div>
            <button onClick={planDay} style={styles.voicePill}>
              {daySchedule ? "重排" : "安排"}
            </button>
          </div>

          <div style={styles.scheduleText}>
            {daySchedule ||
              "今天还没安排。点右上角，让经纪人把你一天排明白。"}
          </div>
        </section>

        {whoop && (
          <section style={styles.card}>
            <div style={styles.cardTop}>
              <div style={styles.label}>WHOOP</div>
              {whoop.connected ? (
                <div
                  style={{
                    ...styles.weekTag,
                    color:
                      whoop.zone === "green"
                        ? "#66d19e"
                        : whoop.zone === "red"
                        ? "#e06a6a"
                        : whoop.zone === "yellow"
                        ? "#e6c15a"
                        : "rgba(255,255,255,0.72)",
                  }}
                >
                  恢复度 {whoop.recovery ?? "—"}
                </div>
              ) : (
                <a href="/api/whoop/connect" style={styles.voicePill}>
                  连接
                </a>
              )}
            </div>

            <div style={styles.fitnessMeta}>
              {whoop.connected
                ? `strain ${whoop.strain ?? "—"} · 睡眠 ${
                    whoop.sleepPerformance ?? "—"
                  }%${
                    whoop.recommendedSleepHours
                      ? ` · 建议睡 ${whoop.recommendedSleepHours}h`
                      : ""
                  }`
                : whoop.authorized
                ? "已授权，正在等待数据同步…"
                : "还没连接。连上后经纪人会按你的恢复度排训练强度。"}
            </div>
          </section>
        )}

        {fitness && fitness.success !== false && (
          <section style={styles.card}>
            <div style={styles.cardTop}>
              <div style={styles.label}>健身 · 减脂</div>
              <div style={styles.weekTag}>
                本周 {fitness.weekDone ?? 0}/{fitness.weeklyTarget ?? 4}
              </div>
            </div>

            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${Math.min(
                    100,
                    ((fitness.weekDone || 0) / (fitness.weeklyTarget || 4)) * 100
                  )}%`,
                }}
              />
            </div>

            <div style={styles.fitnessMeta}>
              {fitness.trainedToday ? "今天已训练 ✓" : "今天还没练"} · 还差{" "}
              {fitness.remaining ?? 0} 次 · 剩 {fitness.daysLeftInWeek ?? 0} 天
              {fitness.lastWeight ? ` · ${fitness.lastWeight.kg}kg` : ""}
            </div>

            <div style={styles.intentRow}>
              <button onClick={fitnessCheckin} style={styles.intentButton}>
                ○ 打卡
              </button>
              <button onClick={logWeight} style={styles.intentButton}>
                ○ 记体重
              </button>
              <button onClick={coachReview} style={styles.intentButton}>
                ○ 教练点评
              </button>
            </div>
          </section>
        )}

        <section style={styles.card}>
          <div style={styles.label}>经纪人</div>

          <div style={styles.replyText}>
            {loading ? "经纪人正在处理…" : reply}
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
            <button onClick={planDay} style={styles.quickButton}>
              ○ 安排一天
            </button>
            <button onClick={fitnessCheckin} style={styles.quickButton}>
              ○ 健身打卡
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
                : "问经纪人…"
            }
            style={styles.input}
          />

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => {
              e.preventDefault();
              startRecording();
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopRecording();
            }}
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
    height: "var(--app-height, 100dvh)",
    minHeight: "var(--app-height, 100dvh)",
    overflow: "hidden",
    background: "#050505",
    color: "white",
    position: "relative",
    fontFamily: "inherit",
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

  scheduleText: {
    marginTop: 20,
    fontSize: 16,
    lineHeight: 1.6,
    fontWeight: 600,
    whiteSpace: "pre-wrap",
    color: "rgba(255,255,255,0.9)",
  },

  weekTag: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: 800,
  },

  progressTrack: {
    marginTop: 18,
    height: 10,
    borderRadius: 999,
    background: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(150,140,255,0.95), rgba(90,170,255,0.95))",
    transition: "width 0.4s ease",
  },

  fitnessMeta: {
    marginTop: 14,
    color: "rgba(255,255,255,0.62)",
    fontSize: 15,
    fontWeight: 650,
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