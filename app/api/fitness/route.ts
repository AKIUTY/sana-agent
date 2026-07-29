import fs from "fs";
import path from "path";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const fitnessPath = path.join(process.cwd(), "memory", "fitness.json");

const STRICT_COACH = `
你是用户的私人减脂经纪人兼健身教练，风格极其严格、直接、说一不二，像顶级韩娱经纪人 + 斯巴达教练。
用户目标：减脂，每周至少训练 4 次。

要求：
- 用中文，简短有力，不啰嗦。
- 用数据说话，直接指出进度好或差。
- 该施压就施压，可以用激将法，但绝不许人身攻击、侮辱人格。
- 给出明确的、命令式的下一步。
- 落后就毫不留情地点破，别安慰。
- 如果 WHOOP 恢复度低（red / 低于 34），命令休息或只做轻量主动恢复，别让用户硬练——严格不等于让人受伤。恢复度高（green）就要求上强度。
`;

function localDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function weekStart(d = new Date()) {
  const wd = d.getDay();
  const diff = wd === 0 ? 6 : wd - 1;
  const mon = new Date(d);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(d.getDate() - diff);
  return localDate(mon);
}

function daysLeftInWeek(d = new Date()) {
  const wd = d.getDay();
  const diff = wd === 0 ? 6 : wd - 1;
  return 7 - diff;
}

function read() {
  return JSON.parse(fs.readFileSync(fitnessPath, "utf-8"));
}

function write(data: any) {
  fs.writeFileSync(fitnessPath, JSON.stringify(data, null, 2));
}

function stats(data: any) {
  const ws = weekStart();
  const today = localDate();

  const checkins = data.checkins || [];
  const weekDone = checkins.filter((c: any) => c.date >= ws).length;
  const trainedToday = checkins.some((c: any) => c.date === today);
  const target = data.weeklyTarget || 4;
  const remaining = Math.max(0, target - weekDone);
  const left = daysLeftInWeek();

  const weights = data.weights || [];
  const lastWeight = weights.length ? weights[weights.length - 1] : null;
  const firstWeight = weights.length ? weights[0] : null;

  return {
    goal: data.goal,
    weeklyTarget: target,
    weekDone,
    remaining,
    trainedToday,
    daysLeftInWeek: left,
    onTrack: remaining <= left,
    lastWeight,
    firstWeight,
    totalCheckins: checkins.length,
  };
}

export async function GET() {
  try {
    const data = read();
    return Response.json({ success: true, ...stats(data) });
  } catch {
    return Response.json({ success: false });
  }
}

export async function POST(req: Request) {
  try {
    const baseUrl = new URL(req.url).origin;
    const data = read();
    const body = await req.json();
    const action = body.action;

    if (action === "checkin") {
      data.checkins = data.checkins || [];
      data.checkins.push({
        date: localDate(),
        time: new Date().toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        note: (body.note || "").trim(),
      });
      write(data);
    } else if (action === "weight") {
      const kg = parseFloat(body.kg);
      if (isNaN(kg)) {
        return Response.json({
          success: false,
          reply: "体重要给我一个数字，别糊弄我。",
        });
      }
      data.weights = data.weights || [];
      data.weights.push({ date: localDate(), kg });
      write(data);
    } else if (action === "setup") {
      if (body.goal) data.goal = body.goal;
      if (body.weeklyTarget) data.weeklyTarget = body.weeklyTarget;
      if (body.targetWeight != null) data.targetWeight = body.targetWeight;
      if (body.startWeight != null) data.startWeight = body.startWeight;
      write(data);
    }

    const s = stats(data);

    let whoop: any = { connected: false };
    try {
      const w = await fetch(`${baseUrl}/api/whoop`, { cache: "no-store" });
      whoop = await w.json();
    } catch {}

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: STRICT_COACH },
        {
          role: "user",
          content: `
动作：${action}
本周进度：${s.weekDone}/${s.weeklyTarget}，还差 ${s.remaining} 次，本周还剩 ${s.daysLeftInWeek} 天，${
            s.onTrack ? "进度勉强跟得上" : "已经落后"
          }。
今天是否已训练：${s.trainedToday ? "是" : "否"}
最近体重：${s.lastWeight ? `${s.lastWeight.kg}kg（${s.lastWeight.date}）` : "无记录"}
起始体重：${s.firstWeight ? `${s.firstWeight.kg}kg` : "无记录"}
WHOOP：${
            whoop.connected
              ? `恢复度 ${whoop.recovery}(${whoop.zone})，strain ${whoop.strain}，睡眠表现 ${whoop.sleepPerformance}%`
              : "未连接"
          }
用户备注：${body.note || body.kg || "无"}
`,
        },
      ],
    });

    return Response.json({
      success: true,
      reply: completion.choices[0].message.content,
      whoop,
      ...s,
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      reply: "健身模块出错了。",
      error: error?.message || String(error),
    });
  }
}
