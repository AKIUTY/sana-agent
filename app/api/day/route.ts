import fs from "fs";
import path from "path";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const routinePath = path.join(process.cwd(), "memory", "routine.json");
const fitnessPath = path.join(process.cwd(), "memory", "fitness.json");

const DAY_SYSTEM = `
你是用户的私人经纪人，像顶级 idol 经纪人 + 斯巴达教练，风格严格、直接、说一不二。
你的工作是把用户的一整天排成清晰的时间块表。
用户是 UCL 的学生，目标减脂，每周至少训练 4 次。

必须覆盖并平衡这些类别：学习、健身、吃饭（含外出吃饭）、休息 / 放松、电脑游戏、社交。

硬规则：
- 严格遵守起床时间和睡觉时间，不许拖。
- 学习时间必须达到目标时长。
- 电脑游戏是奖励：有硬性上限，必须在完成学习和训练之后才允许，超时直接砍掉。
- 训练安排：如果本周训练次数落后于每周 4 次的目标、且今天还没训练，今天就必须安排训练；
  但如果 WHOOP 恢复度低（red / 低于 34），改成休息或轻量主动恢复，绝不许硬练；恢复度高（green）就上强度。
- 每个时间块给出：时间段 + 【类别】标签 + 具体做什么。
- 结尾用一句严厉的经纪人式命令收尾。

输出用中文，时间用 24 小时制，简洁、不废话。
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

export async function GET() {
  try {
    const routine = JSON.parse(fs.readFileSync(routinePath, "utf-8"));
    const today = localDate();
    const schedule =
      routine.scheduleDate === today ? routine.todaySchedule : null;

    return Response.json({
      success: true,
      schedule,
      wake: routine.wake,
      sleep: routine.sleep,
    });
  } catch {
    return Response.json({ success: false, schedule: null });
  }
}

export async function POST(req: Request) {
  try {
    const baseUrl = new URL(req.url).origin;
    const routine = JSON.parse(fs.readFileSync(routinePath, "utf-8"));
    const fitness = JSON.parse(fs.readFileSync(fitnessPath, "utf-8"));
    const body = await req.json().catch(() => ({}));
    const notes = (body.notes || "").trim();

    const ws = weekStart();
    const today = localDate();
    const checkins = fitness.checkins || [];
    const weekDone = checkins.filter((c: any) => c.date >= ws).length;
    const target = fitness.weeklyTarget || 4;
    const remaining = Math.max(0, target - weekDone);
    const left = daysLeftInWeek();
    const trainedToday = checkins.some((c: any) => c.date === today);

    let whoop: any = { connected: false };
    try {
      whoop = await (
        await fetch(`${baseUrl}/api/whoop`, { cache: "no-store" })
      ).json();
    } catch {}

    let weather: any = null;
    try {
      weather = await (
        await fetch(`${baseUrl}/api/weather`, { cache: "no-store" })
      ).json();
    } catch {}

    const nowTime = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const prompt = `
现在时间：${nowTime}
起床时间：${routine.wake}
睡觉时间：${routine.sleep}
学习目标时长：${routine.studyHoursPerDay} 小时
电脑游戏上限：${routine.gamingCapHours} 小时
固定安排：${
      Array.isArray(routine.fixed) && routine.fixed.length
        ? routine.fixed.join("；")
        : "无"
    }

本周训练进度：${weekDone}/${target}，还差 ${remaining} 次，本周还剩 ${left} 天，今天${
      trainedToday ? "已训练" : "还没训练"
    }。
WHOOP：${
      whoop.connected
        ? `恢复度 ${whoop.recovery}(${whoop.zone})，strain ${whoop.strain}，睡眠表现 ${whoop.sleepPerformance}%`
        : "未连接（按正常状态安排，并提醒用户没有恢复度数据）"
    }
天气：${weather ? `${weather.city} ${weather.temperature}°C ${weather.weather}` : "未知"}

用户今天的补充 / 固定事项：${notes || "无"}

请据此把今天从起床到睡觉排成时间块表。
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: DAY_SYSTEM },
        { role: "user", content: prompt },
      ],
    });

    const schedule = completion.choices[0].message.content;

    routine.todaySchedule = schedule;
    routine.scheduleDate = today;
    fs.writeFileSync(routinePath, JSON.stringify(routine, null, 2));

    return Response.json({
      success: true,
      schedule,
      meta: { weekDone, target, remaining, left, trainedToday, whoop },
    });
  } catch (error: any) {
    return Response.json({
      success: false,
      schedule: "今日行程生成失败。",
      error: error?.message || String(error),
    });
  }
}
