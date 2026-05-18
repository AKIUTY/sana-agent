import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {

    const weatherRes =
      await fetch(
        "http://localhost:3000/api/weather"
      );

    const weather =
      await weatherRes.json();

    const financeRes =
      await fetch(
        "http://localhost:3000/api/finance"
      );

    const finance =
      await financeRes.json();

    const unreadRes =
      await fetch(
        "http://localhost:3000/api/unread"
      );

    const unread =
      await unreadRes.json();

    const prompt = `
天气：
${weather.temperature}°C
${weather.weather}

财经：
${finance.summary}

未读邮件：
${unread.total} 封

请生成一段像私人AI助理一样的中文今日总结。

要求：
- 温柔
- 简洁
- 有陪伴感
- 不像新闻联播
- 必须提到未读邮件数量
`;

    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages: [

          {
            role: "system",
            content:
              "你是私人AI助理 SANA。",
          },

          {
            role: "user",
            content: prompt,
          },

        ],

      });

    return Response.json({

      success: true,

      summary:
        completion.choices[0].message.content,

    });

  } catch {

    return Response.json({

      success: false,

      summary:
        "今天的信息暂时无法整理。",

    });

  }

}