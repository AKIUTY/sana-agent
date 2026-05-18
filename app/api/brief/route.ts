import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
  try {
    const baseUrl = new URL(req.url).origin;

    const weatherRes = await fetch(`${baseUrl}/api/weather`);
    const weather = await weatherRes.json();

    const financeRes = await fetch(`${baseUrl}/api/finance`);
    const finance = await financeRes.json();

    const unreadRes = await fetch(`${baseUrl}/api/unread`);
    const unread = await unreadRes.json();

    const prompt = `
天气：
${weather.city} ${weather.temperature}°C ${weather.weather}

财经：
${finance.summary}

未读邮件：
${unread.total} 封

请生成一段像私人 AI 助理一样的中文今日总结。

要求：
- 温柔
- 简洁
- 有陪伴感
- 必须提到未读邮件数量
- 不要像新闻播报
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