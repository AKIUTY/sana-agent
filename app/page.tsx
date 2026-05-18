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
      className="
      h-[100dvh]
      overflow-hidden
      bg-[#050505]
      text-white
      relative
      flex
      flex-col
    "
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1a1a2d_0%,#050505_55%)] opacity-80" />

      <div
        className="
        relative
        z-10
        flex-1
        overflow-y-auto
        px-6
        pt-[max(env(safe-area-inset-top),32px)]
        pb-40
      "
      >
        <div className="space-y-3">
          <h1 className="text-[88px] leading-[0.9] font-black tracking-[-6px]">
            {time}
          </h1>

          <div className="space-y-1 text-white/70">
            <p className="text-[18px] font-medium">5月18日 星期一</p>

            <p className="text-[18px]">London • 9°C • 多云</p>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-[72px] leading-none font-black">早上好</h2>

          <p className="mt-3 text-white/55 text-[20px] font-medium">
            sana 已在线。
          </p>
        </div>

        <div
          className="
          mt-10
          rounded-[34px]
          border
          border-white/8
          bg-white/[0.03]
          backdrop-blur-xl
          p-7
        "
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/45 text-sm">今日总结</p>

              <p className="mt-6 text-[34px] leading-tight font-semibold">
                正在整理今天的重要信息…
              </p>
            </div>

            <button
              className="
              h-14
              w-14
              rounded-full
              border
              border-white/10
              bg-white/[0.04]
              flex
              items-center
              justify-center
              active:scale-95
              transition
            "
            >
              <div className="h-3 w-3 rounded-full bg-white/80 animate-pulse" />
            </button>
          </div>
        </div>

        <div
          className="
          mt-6
          rounded-[34px]
          border
          border-white/8
          bg-white/[0.02]
          backdrop-blur-xl
          p-7
        "
        >
          <p className="text-white/40 text-sm">sana</p>

          <p className="mt-5 text-[36px] leading-tight font-semibold">
            今天想让我先处理什么？
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {["邮件", "待办", "日程"].map((item) => (
              <button
                key={item}
                className="
                px-5
                py-3
                rounded-full
                border
                border-white/10
                bg-white/[0.03]
                text-[16px]
                active:scale-95
                transition-all
                duration-200
                hover:bg-white/[0.06]
              "
              >
                ○ {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="
        fixed
        bottom-0
        left-0
        right-0
        z-20
        px-5
        pb-[max(env(safe-area-inset-bottom),24px)]
      "
      >
        <div
          className="
          rounded-[34px]
          border
          border-white/10
          bg-[#0d0d0d]/90
          backdrop-blur-2xl
          p-3
          shadow-2xl
        "
        >
          {expanded && (
            <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
              {["○ 邮件", "○ 待办", "○ 日程", "○ 文件"].map((item) => (
                <button
                  key={item}
                  className="
                  whitespace-nowrap
                  px-4
                  py-2
                  rounded-full
                  bg-white/[0.05]
                  border
                  border-white/10
                  text-sm
                "
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="
              h-14
              w-14
              shrink-0
              rounded-full
              bg-white/[0.04]
              border
              border-white/10
              text-3xl
              text-white/90
              flex
              items-center
              justify-center
              active:scale-95
              transition
            "
            >
              {expanded ? "×" : "+"}
            </button>

            <input
              placeholder="问 sana…"
              className="
              flex-1
              bg-transparent
              outline-none
              text-[18px]
              placeholder:text-white/35
            "
            />

            <button
              className="
              h-14
              w-14
              shrink-0
              rounded-full
              border
              border-white/10
              bg-white/[0.04]
              flex
              items-center
              justify-center
              active:scale-95
              transition
            "
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute h-6 w-6 rounded-full bg-white/10 animate-ping" />

                <div className="relative h-3 w-3 rounded-full bg-white/80" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}