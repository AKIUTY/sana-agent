import OpenAI from "openai";

export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
  try {
    const baseUrl = new URL(req.url).origin;

    const now = new Date();
    const hour = now.getHours();

    let greeting = "晚上好";

    if (hour < 5) greeting = "深夜了";
    else if (hour < 12) greeting = "早上好";
    else if (hour < 18) greeting = "下午好";
    else greeting = "晚上好";

    const weatherRes = await fetch(`${baseUrl}/api/weather`, {
      cache: "no-store",
    });
    const weather = await weatherRes.json();

    const financeRes = await fetch(`${baseUrl}/api/finance`, {
      cache: "no-store",
    });
    const finance = await financeRes.json();

    const unreadRes = await fetch(`${baseUrl}/api/unread`, {
      cache: "no-store",
    });
    const unread = await unreadRes.json();

    const prompt = `
当前问候语：${greeting}

天气：
${weather.city} ${weather.temperature}°C ${weather.weather}

财经：
${finance.summary}

未读邮件：
${unread.total} 封

请生成一段像私人 AI 助理 sana 一样的中文今日总结。

要求：
- 第一行必须使用：${greeting}
- 必须提到未读邮件数量
- 语气温柔、自然、简洁
- 不要像新闻播报
- 不要出现错误的时间问候
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "你是私人 AI 助理 sana。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return Response.json({
      success: true,
      greeting,
      summary: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error("BRIEF ERROR:", error);

    return Response.json({
      success: false,
      summary: "今天的信息暂时无法整理。",
      error: error?.message || String(error),
    });
  }
}