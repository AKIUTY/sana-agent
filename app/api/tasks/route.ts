import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const summaryRes = await fetch("http://localhost:3000/api/summary");
    const summaryData = await summaryRes.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "你是 sana 的待办整理模块。请根据邮件内容和用户补充信息，生成今日待办事项。只输出真正需要行动的事项，用中文，简洁清楚。",
        },
        {
          role: "user",
          content: `
邮件内容：
${summaryData.summary}

用户补充信息：
${body.text}
`,
        },
      ],
    });

    return Response.json({
      success: true,
      tasks: completion.choices[0].message.content,
    });
  } catch {
    return Response.json({
      success: false,
      tasks: "今日待办生成失败。",
    });
  }
}