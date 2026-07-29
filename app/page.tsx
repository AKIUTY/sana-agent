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

    function loadDashboard() {
      // Fire every card's data in parallel so one slow endpoint (e.g. the
      // AI brief) never blocks the others from filling in.
      fetch("/api/weather")
        .then((r) => r.json())
        .then((d) =>
          setWeather(
            `${d.city || "London"} · ${d.temperature ?? "?"}°C · ${
              d.weather || "天气更新中"
            }`
          )
        )
        .catch(() => {});

      fetch("/api/brief")
        .then((r) => r.json())
        .then((d) => setBrief(d.summary || "今日总结暂时无法生成。"))
        .catch(() => setBrief("今日总结暂时无法生成。"));

      fetch("/api/fitness")
        .then((r) => r.json())
        .then(setFitness)
        .catch(() => {});

      fetch("/api/whoop")
        .then((r) => r.json())
        .then(setWhoop)
        .catch(() => {});

      fetch("/api/day")
        .then((r) => r.json())
        .then((d) => {
          if (d.schedule) setDaySchedule(d.schedule);
        })
        .catch(() => {});
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
                <a
                  href="/api/whoop/connect"
                  role="button"
                  style={styles.voicePill}
                >
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
  打卡
              </button>
              <button onClick={logWeight} style={styles.intentButton}>
  记体重
              </button>
              <button onClick={coachReview} style={styles.intentButton}>
  教练点评
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
邮件
            </button>
            <button onClick={generateTasks} style={styles.intentButton}>
待办
            </button>
            <button onClick={generateCalendar} style={styles.intentButton}>
日程
            </button>
          </div>
        </section>
      </section>

      <section style={styles.inputDock}>
        {menuOpen && (
          <div style={styles.quickPanel}>
            <button onClick={summarizeEmails} style={styles.quickButton}>
总结邮件
            </button>
            <button onClick={generateTasks} style={styles.quickButton}>
生成待办
            </button>
            <button onClick={generateCalendar} style={styles.quickButton}>
识别日程
            </button>
            <button onClick={planDay} style={styles.quickButton}>
安排一天
            </button>
            <button onClick={fitnessCheckin} style={styles.quickButton}>
健身打卡
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
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.08)",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    height: "var(--app-height, 100dvh)",
    minHeight: "var(--app-height, 100dvh)",
    overflow: "hidden",
    background: "#0a0b0d",
    color: "#f2f3f5",
    position: "relative",
    fontFamily: "inherit",
  },

  bgGlow: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(120% 70% at 50% -10%, rgba(96,112,140,0.10), transparent 60%), #0a0b0d",
    pointerEvents: "none",
  },

  content: {
    position: "relative",
    zIndex: 1,
    height: "100%",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    overscrollBehaviorY: "contain",
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: "max(env(safe-area-inset-top), 28px)",
    paddingBottom: 172,
  },

  top: {
    marginTop: 6,
  },

  time: {
    fontSize: "clamp(52px, 15vw, 78px)",
    fontWeight: 300,
    letterSpacing: -1.5,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },

  meta: {
    marginTop: 7,
    color: "rgba(233,236,241,0.5)",
    fontSize: 13.5,
    fontWeight: 500,
    letterSpacing: 0.2,
  },

  greetingBlock: {
    marginTop: 40,
  },

  greeting: {
    fontSize: "clamp(28px, 7.5vw, 38px)",
    fontWeight: 600,
    letterSpacing: -0.4,
    lineHeight: 1.12,
    color: "#f2f3f5",
  },

  status: {
    marginTop: 10,
    color: "rgba(233,236,241,0.42)",
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: 0.3,
  },

  card: {
    ...glass,
    marginTop: 14,
    borderRadius: 20,
    padding: 20,
  },

  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  label: {
    color: "rgba(233,236,241,0.4)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },

  voicePill: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    color: "rgba(233,236,241,0.75)",
    borderRadius: 999,
    padding: "8px 14px",
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: 0.3,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  },

  briefText: {
    marginTop: 16,
    fontSize: 16.5,
    lineHeight: 1.62,
    fontWeight: 500,
    letterSpacing: 0.1,
    color: "rgba(242,243,245,0.92)",
    whiteSpace: "pre-wrap",
  },

  scheduleText: {
    marginTop: 16,
    fontSize: 14.5,
    lineHeight: 1.7,
    fontWeight: 400,
    whiteSpace: "pre-wrap",
    color: "rgba(242,243,245,0.82)",
  },

  weekTag: {
    color: "rgba(233,236,241,0.6)",
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: 0.3,
    fontVariantNumeric: "tabular-nums",
  },

  progressTrack: {
    marginTop: 16,
    height: 6,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(150,165,190,0.85), rgba(184,196,216,0.95))",
    transition: "width 0.45s ease",
  },

  fitnessMeta: {
    marginTop: 12,
    color: "rgba(233,236,241,0.5)",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.2,
  },

  replyText: {
    marginTop: 14,
    fontSize: 16.5,
    lineHeight: 1.62,
    fontWeight: 500,
    letterSpacing: 0.1,
    color: "rgba(242,243,245,0.92)",
    whiteSpace: "pre-wrap",
  },

  intentRow: {
    marginTop: 18,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  intentButton: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "9px 15px",
    color: "rgba(233,236,241,0.72)",
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 0.2,
  },

  inputDock: {
    position: "fixed",
    zIndex: 10,
    left: 12,
    right: 12,
    bottom: "max(env(safe-area-inset-bottom), 12px)",
    borderRadius: 22,
    padding: 10,
    background: "rgba(14,15,18,0.72)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 -12px 40px rgba(0,0,0,0.4)",
  },

  quickPanel: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 10,
  },

  quickButton: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    whiteSpace: "nowrap",
    color: "rgba(233,236,241,0.72)",
    borderRadius: 999,
    padding: "9px 14px",
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: 0.2,
  },

  listenPanel: {
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    padding: "11px 14px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "rgba(233,236,241,0.7)",
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: 0.2,
  },

  listenOrb: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "rgba(170,184,205,0.95)",
    boxShadow: "0 0 12px rgba(150,165,190,0.7)",
  },

  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  plusButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(233,236,241,0.8)",
    fontSize: 24,
    fontWeight: 400,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#f2f3f5",
    outline: "none",
    paddingLeft: 15,
    paddingRight: 15,
    fontSize: 16,
    fontWeight: 500,
  },

  micButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.09)",
    background: "rgba(255,255,255,0.05)",
    color: "rgba(233,236,241,0.8)",
    fontSize: 18,
    fontWeight: 500,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  micButtonActive: {
    border: "1px solid rgba(160,175,200,0.6)",
    background: "rgba(160,175,200,0.14)",
    boxShadow: "0 0 0 4px rgba(160,175,200,0.10)",
    color: "#f2f3f5",
  },

  sendButton: {
    height: 48,
    borderRadius: 14,
    border: "none",
    background: "#f2f3f5",
    color: "#0a0b0d",
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 14.5,
    fontWeight: 650,
    flexShrink: 0,
  },
};