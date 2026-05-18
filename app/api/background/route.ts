import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const weatherRes = await fetch("http://localhost:3000/api/weather");
    const weather = await weatherRes.json();

    const unreadRes = await fetch("http://localhost:3000/api/unread");
    const unread = await unreadRes.json();

    const financeRes = await fetch("http://localhost:3000/api/finance");
    const finance = await financeRes.json();

    const prompt = `
当前信息：

天气：
${weather.city} ${weather.temperature}°C ${weather.weather}

未读邮件：
${unread.total} 封

财经：
${finance.summary}

请判断现在是否有什么值得提醒用户的事情。

要求：
- 中文
- 简洁
- 像私人助理
- 如果没有重要提醒，就说“目前没有特别需要处理的事项。”
- 如果有提醒，请按重要性排序
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "你是 sana 的后台提醒模块。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return Response.json({
      success: true,
      reminder: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      reminder: "后台检查失败。",
    });
  }
}