"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [greeting, setGreeting] = useState("早上好");
  const [weather, setWeather] = useState("London · 9°C · 多云");

  const [brief, setBrief] = useState("");
  const [reply, setReply] = useState("今天想让我先处理什么？");

  const [daySchedule, setDaySchedule] = useState("");
  const [fitness, setFitness] = useState<any>(null);
  const [whoop, setWhoop] = useState<any>(null);

  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<"idle" | "playing" | "paused">(
    "idle"
  );
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  // What the reply card should say while a given action is running.
  const busyText: Record<string, string> = {
    agent: "经纪人正在处理…",
    email: "正在读你的邮件…",
    tasks: "正在整理今日待办…",
    calendar: "正在识别日程…",
    coach: "教练正在点评…",
    checkin: "正在记录打卡…",
    weight: "正在记录体重…",
  };

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
    if (!message.trim() || busy) return;

    const sent = message;
    setBusy("agent");
    setMenuOpen(false);
    setMessage("");

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: sent }),
      });

      const data = await res.json();
      setReply(data.reply || "经纪人没有返回内容。");
    } catch {
      setReply("经纪人当前无法连接。");
    }

    setBusy(null);
  }

  async function summarizeEmails() {
    if (busy) return;
    setBusy("email");
    setMenuOpen(false);

    try {
      const res = await fetch("/api/summary");
      const data = await res.json();
      setReply(data.summary || "没有读取到邮件总结。");
    } catch {
      setReply("无法读取邮件。");
    }

    setBusy(null);
  }

  async function generateTasks() {
    if (busy) return;
    setBusy("tasks");
    setMenuOpen(false);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: message || "根据今天的邮件和当前情况生成待办。",
        }),
      });

      const data = await res.json();
      setReply(data.tasks || "今天暂无待办事项。");
      showToast("待办已生成 ✓");
    } catch {
      setReply("今日待办生成失败。");
    }

    setMessage("");
    setBusy(null);
  }

  async function generateCalendar() {
    if (busy) return;
    if (!message.trim()) {
      setReply("先输入一段日程，例如：明天下午三点开会。");
      setMenuOpen(false);
      return;
    }

    setBusy("calendar");
    setMenuOpen(false);

    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      const data = await res.json();
      setReply(data.calendar || "暂时没有识别到日程。");
    } catch {
      setReply("日程生成失败。");
    }

    setMessage("");
    setBusy(null);
  }

  async function planDay() {
    if (busy) return;
    setBusy("day");
    setMenuOpen(false);

    try {
      const res = await fetch("/api/day", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: message }),
      });

      const data = await res.json();
      if (data.success !== false && data.schedule) {
        setDaySchedule(data.schedule);
        showToast("今日行程已更新 ✓");
      } else {
        setDaySchedule("今日行程生成失败。");
        showToast("行程没排成，稍后再试");
      }
    } catch {
      setDaySchedule("今日行程生成失败。");
      showToast("行程没排成，稍后再试");
    }

    setMessage("");
    setBusy(null);
  }

  async function fitnessCheckin() {
    if (busy) return;
    setBusy("checkin");
    setMenuOpen(false);

    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkin", note: message }),
      });

      const data = await res.json();
      setReply(data.reply || "打卡失败。");
      if (data.success) {
        setFitness(data);
        showToast(`已打卡 ✓ 本周 ${data.weekDone}/${data.weeklyTarget}`);
      } else {
        showToast("打卡没成功，稍后再试");
      }
    } catch {
      setReply("打卡失败。");
      showToast("打卡没成功，稍后再试");
    }

    setMessage("");
    setBusy(null);
  }

  async function logWeight() {
    if (busy) return;
    if (!message.trim()) {
      setReply("先在输入框里写今天的体重，例如 72.5。");
      setMenuOpen(false);
      return;
    }

    setBusy("weight");
    setMenuOpen(false);

    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "weight", kg: message }),
      });

      const data = await res.json();
      setReply(data.reply || "体重记录失败。");
      if (data.success) {
        setFitness(data);
        showToast(
          `体重已记录${data.lastWeight ? ` ${data.lastWeight.kg}kg` : ""} ✓`
        );
      } else {
        showToast("体重没记上，检查一下数字");
      }
    } catch {
      setReply("体重记录失败。");
      showToast("体重没记上，稍后再试");
    }

    setMessage("");
    setBusy(null);
  }

  async function coachReview() {
    if (busy) return;
    setBusy("coach");
    setMenuOpen(false);

    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "coach" }),
      });

      const data = await res.json();
      setReply(data.reply || "教练暂时没空。");
      if (data.success) setFitness(data);
    } catch {
      setReply("教练暂时没空。");
    }

    setBusy(null);
  }

  async function toggleVoice() {
    // Playing → pause (keep position).
    if (voiceState === "playing") {
      audioRef.current?.pause();
      setVoiceState("paused");
      return;
    }

    // Paused → resume from where it stopped.
    if (voiceState === "paused" && audioRef.current) {
      audioRef.current.play();
      setVoiceState("playing");
      return;
    }

    // Idle → fetch and play from the start.
    const text = brief;
    if (!text || !text.trim()) return;

    setVoiceState("playing");

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
      audioRef.current = audio;

      const cleanup = () => {
        setVoiceState("idle");
        audioRef.current = null;
        URL.revokeObjectURL(url);
      };
      audio.onended = cleanup;
      audio.onerror = cleanup;

      await audio.play();
    } catch {
      setVoiceState("idle");
      audioRef.current = null;
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

  const skeletonLines = (n: number) =>
    Array.from({ length: n }).map((_, i) => (
      <div
        key={i}
        className="cc-skel"
        style={{
          height: 13,
          marginTop: i === 0 ? 16 : 10,
          width: i === n - 1 ? "55%" : "100%",
        }}
      />
    ));

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

        {/* 今日简报：压缩成一个语音窗口，可随时暂停 */}
        <button
          onClick={toggleVoice}
          disabled={!brief}
          style={styles.voiceWindow}
          className="cc-enter"
        >
          <span style={styles.voiceIcon}>
            {voiceState === "playing" ? "❚❚" : "▶"}
          </span>
          <span style={styles.voiceTextWrap}>
            <span style={styles.voiceTitle}>今日简报</span>
            <span style={styles.voiceHint}>
              {!brief
                ? "整理中…"
                : voiceState === "playing"
                ? "正在念给你听 · 点一下暂停"
                : voiceState === "paused"
                ? "已暂停 · 点一下继续"
                : "点一下，我念给你听"}
            </span>
          </span>
        </button>

        {/* 今日行程：主角 */}
        <section
          style={{ ...styles.heroCard, animationDelay: "60ms" }}
          className="cc-enter"
        >
          <div style={styles.cardTop}>
            <div style={styles.label}>今日行程</div>
            <button
              onClick={planDay}
              disabled={busy !== null}
              style={styles.voicePill}
            >
              {busy === "day" ? (
                <span className="cc-spin" />
              ) : daySchedule ? (
                "重排"
              ) : (
                "安排"
              )}
            </button>
          </div>

          {busy === "day" ? (
            <div style={styles.scheduleText}>正在把你今天排明白…</div>
          ) : (
            <div key={daySchedule} style={styles.scheduleText} className="cc-fade">
              {daySchedule ||
                "今天还没安排。点右上角，让经纪人把你一天排明白。"}
            </div>
          )}
        </section>

        {/* WHOOP + 健身：两个紧凑方块 */}
        <div style={styles.tileRow}>
          <section
            style={{ ...styles.tile, animationDelay: "100ms" }}
            className="cc-enter"
          >
            <div style={styles.tileHead}>
              <span style={styles.label}>WHOOP</span>
            </div>
            {!whoop ? (
              <div>{skeletonLines(1)}</div>
            ) : whoop.connected ? (
              <>
                <div
                  style={{
                    ...styles.tileValue,
                    color:
                      whoop.zone === "green"
                        ? "#7fb8a0"
                        : whoop.zone === "red"
                        ? "#cf8a8a"
                        : whoop.zone === "yellow"
                        ? "#cbb27e"
                        : "#f2f3f5",
                  }}
                >
                  {whoop.recovery ?? "—"}
                </div>
                <div style={styles.tileSub}>
                  恢复度
                  {whoop.recommendedSleepHours
                    ? ` · 睡 ${whoop.recommendedSleepHours}h`
                    : ""}
                </div>
              </>
            ) : (
              <>
                <div style={styles.tileSub}>
                  {whoop.authorized ? "同步中…" : "按恢复度排训练"}
                </div>
                <a
                  href="/api/whoop/connect"
                  role="button"
                  style={styles.tileAction}
                >
                  连接
                </a>
              </>
            )}
          </section>

          <section
            style={{ ...styles.tile, animationDelay: "140ms" }}
            className="cc-enter"
          >
            <div style={styles.tileHead}>
              <span style={styles.label}>健身</span>
              {fitness && fitness.success !== false ? (
                <span style={styles.tileBadge}>
                  {fitness.weekDone ?? 0}/{fitness.weeklyTarget ?? 4}
                </span>
              ) : null}
            </div>
            {!fitness ? (
              <div>{skeletonLines(1)}</div>
            ) : fitness.success === false ? (
              <div style={styles.tileSub}>读取不了</div>
            ) : (
              <>
                <div style={styles.miniTrack}>
                  <div
                    style={{
                      ...styles.miniFill,
                      width: `${Math.min(
                        100,
                        ((fitness.weekDone || 0) /
                          (fitness.weeklyTarget || 4)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <div style={styles.tileSub}>
                  {fitness.trainedToday
                    ? "今天已练 ✓"
                    : `还差 ${fitness.remaining ?? 0} 次`}
                </div>
                <button
                  onClick={fitnessCheckin}
                  disabled={busy !== null}
                  style={styles.tileAction}
                >
                  {busy === "checkin" ? <span className="cc-spin" /> : "打卡"}
                </button>
              </>
            )}
          </section>
        </div>

        <section style={{ ...styles.card, animationDelay: "200ms" }} className="cc-enter">
          <div style={styles.label}>经纪人</div>

          <div
            key={busy && busyText[busy] ? busy : reply}
            style={styles.replyText}
            className="cc-fade"
          >
            {busy && busyText[busy] ? busyText[busy] : reply}
          </div>

          <div style={styles.intentRow}>
            <button
              onClick={summarizeEmails}
              disabled={busy !== null}
              style={styles.intentButton}
            >
              {busy === "email" ? <span className="cc-spin" /> : "邮件"}
            </button>
            <button
              onClick={generateTasks}
              disabled={busy !== null}
              style={styles.intentButton}
            >
              {busy === "tasks" ? <span className="cc-spin" /> : "待办"}
            </button>
            <button
              onClick={generateCalendar}
              disabled={busy !== null}
              style={styles.intentButton}
            >
              {busy === "calendar" ? <span className="cc-spin" /> : "日程"}
            </button>
          </div>
        </section>
      </section>

      <section style={styles.inputDock}>
        {menuOpen && (
          <div style={styles.quickPanel}>
            <button
              onClick={summarizeEmails}
              disabled={busy !== null}
              style={styles.quickButton}
            >
              总结邮件
            </button>
            <button
              onClick={generateTasks}
              disabled={busy !== null}
              style={styles.quickButton}
            >
              生成待办
            </button>
            <button
              onClick={generateCalendar}
              disabled={busy !== null}
              style={styles.quickButton}
            >
              识别日程
            </button>
            <button
              onClick={planDay}
              disabled={busy !== null}
              style={styles.quickButton}
            >
              安排一天
            </button>
            <button
              onClick={fitnessCheckin}
              disabled={busy !== null}
              style={styles.quickButton}
            >
              健身打卡
            </button>
            <button
              onClick={logWeight}
              disabled={busy !== null}
              style={styles.quickButton}
            >
              记体重
            </button>
            <button
              onClick={coachReview}
              disabled={busy !== null}
              style={styles.quickButton}
            >
              教练点评
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
            disabled={!message.trim() || busy !== null}
            style={{
              ...styles.sendButton,
              opacity: message.trim() && busy === null ? 1 : 0.4,
            }}
          >
            {busy === "agent" ? <span className="cc-spin" /> : "发送"}
          </button>
        </div>
      </section>

      {toast && (
        <div style={styles.toast} className="cc-fade">
          {toast}
        </div>
      )}
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

  voiceWindow: {
    marginTop: 18,
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "13px 15px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    textAlign: "left",
    color: "#f2f3f5",
  },

  voiceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.1)",
    fontSize: 13,
    color: "#f2f3f5",
  },

  voiceTextWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
  },

  voiceTitle: {
    fontSize: 14.5,
    fontWeight: 600,
    color: "#f2f3f5",
    letterSpacing: 0.2,
  },

  voiceHint: {
    fontSize: 12.5,
    fontWeight: 500,
    color: "rgba(233,236,241,0.45)",
    letterSpacing: 0.2,
  },

  heroCard: {
    ...glass,
    marginTop: 16,
    borderRadius: 22,
    padding: 22,
  },

  tileRow: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  tile: {
    ...glass,
    borderRadius: 18,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    minHeight: 122,
  },

  tileHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  tileValue: {
    marginTop: 12,
    fontSize: 32,
    fontWeight: 300,
    letterSpacing: -0.5,
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
  },

  tileSub: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: 500,
    color: "rgba(233,236,241,0.5)",
    letterSpacing: 0.2,
  },

  tileBadge: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "rgba(233,236,241,0.62)",
    fontVariantNumeric: "tabular-nums",
  },

  tileAction: {
    marginTop: "auto",
    alignSelf: "flex-start",
    padding: "7px 14px",
    borderRadius: 10,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(233,236,241,0.85)",
    fontSize: 12.5,
    fontWeight: 600,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  miniTrack: {
    marginTop: 14,
    height: 5,
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },

  miniFill: {
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(150,165,190,0.85), rgba(184,196,216,0.95))",
    transition: "width 0.45s ease",
  },

  toast: {
    position: "fixed",
    zIndex: 20,
    left: "50%",
    transform: "translateX(-50%)",
    bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
    maxWidth: "calc(100% - 40px)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    padding: "11px 18px",
    borderRadius: 999,
    background: "rgba(28,30,34,0.92)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f2f3f5",
    fontSize: 13.5,
    fontWeight: 600,
    letterSpacing: 0.3,
    boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
  },
};