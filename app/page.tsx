"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [time, setTime] = useState("");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <main
      style={{
        height: "100dvh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at top, rgba(30,30,50,0.85) 0%, #050505 55%)",
        color: "white",
        position: "relative",
        fontFamily:
          "-apple-system,BlinkMacSystemFont,'SF Pro Display','PingFang SC',sans-serif",
      }}
    >
      {/* 主内容 */}
      <div
        style={{
          height: "100%",
          overflowY: "auto",
          paddingLeft: 24,
          paddingRight: 24,
          paddingTop: "max(env(safe-area-inset-top),32px)",
          paddingBottom: 180,
        }}
      >
        {/* 时间 */}
        <div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: -6,
            }}
          >
            {time}
          </div>

          <div
            style={{
              marginTop: 20,
              color: "rgba(255,255,255,0.72)",
              fontSize: 20,
              lineHeight: 1.7,
            }}
          >
            <div>5月18日 星期一</div>
            <div>London • 9°C • 多云</div>
          </div>
        </div>

        {/* 欢迎 */}
        <div style={{ marginTop: 70 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -4,
            }}
          >
            早上好
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 24,
              color: "rgba(255,255,255,0.58)",
              fontWeight: 600,
            }}
          >
            sana 已在线。
          </div>
        </div>

        {/* 今日总结 */}
        <div
          style={{
            marginTop: 36,
            borderRadius: 36,
            padding: 28,
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.45)",
                }}
              >
                今日总结
              </div>

              <div
                style={{
                  marginTop: 28,
                  fontSize: 38,
                  lineHeight: 1.3,
                  fontWeight: 700,
                }}
              >
                正在整理今天的重要信息…
              </div>
            </div>

            {/* voice */}
            <button
              style={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 16,
                fontWeight: 700,
                backdropFilter: "blur(12px)",
              }}
            >
              Voice
            </button>
          </div>
        </div>

        {/* AI 卡片 */}
        <div
          style={{
            marginTop: 24,
            borderRadius: 36,
            padding: 28,
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: "rgba(255,255,255,0.4)",
            }}
          >
            sana
          </div>

          <div
            style={{
              marginTop: 24,
              fontSize: 42,
              lineHeight: 1.3,
              fontWeight: 700,
            }}
          >
            今天想让我先处理什么？
          </div>

          {/* 按钮 */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 34,
              flexWrap: "wrap",
            }}
          >
            {["邮件", "待办", "日程"].map((item) => (
              <button
                key={item}
                style={{
                  padding: "14px 22px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  color: "white",
                  fontSize: 17,
                  fontWeight: 600,
                  backdropFilter: "blur(10px)",
                }}
              >
                ○ {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 底部输入栏 */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          paddingLeft: 18,
          paddingRight: 18,
          paddingBottom: "max(env(safe-area-inset-bottom),20px)",
          zIndex: 20,
        }}
      >
        <div
          style={{
            borderRadius: 38,
            background: "rgba(15,15,15,0.78)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 14,
            boxShadow: "0 -10px 40px rgba(0,0,0,0.45)",
          }}
        >
          {/* 展开功能 */}
          {expanded && (
            <div
              style={{
                display: "flex",
                gap: 10,
                overflowX: "auto",
                marginBottom: 14,
                paddingBottom: 4,
              }}
            >
              {["○ 邮件", "○ 待办", "○ 日程", "○ 文件"].map((item) => (
                <button
                  key={item}
                  style={{
                    whiteSpace: "nowrap",
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    color: "white",
                    fontSize: 15,
                    fontWeight: 600,
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* 输入区域 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {/* + */}
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "white",
                fontSize: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {expanded ? "×" : "+"}
            </button>

            {/* 输入框 */}
            <input
              placeholder="问 sana..."
              style={{
                flex: 1,
                height: 58,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.03)",
                color: "white",
                paddingLeft: 22,
                paddingRight: 22,
                fontSize: 18,
                outline: "none",
                backdropFilter: "blur(12px)",
              }}
            />

            {/* 语音 */}
            <button
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "white",
                  opacity: 0.9,
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}