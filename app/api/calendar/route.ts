import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const baseUrl = new URL(req.url).origin;
    const body = await req.json();

    const now = new Date();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
你是 sana 的日程识别模块。

请从用户输入中识别日程，并只返回 JSON。

当前时间：
${now.toISOString()}

返回格式：
{
  "title": "事件标题",
  "description": "事件描述",
  "startTime": "ISO时间",
  "endTime": "ISO时间",
  "shouldCreateCalendar": true
}

规则：
- 如果用户有明确时间，就用用户时间。
- 如果没有结束时间，默认 1 小时。
- 如果只是聊天，不是日程，shouldCreateCalendar 为 false。
- 不要解释，只返回 JSON。
`,
        },
        {
          role: "user",
          content: body.text,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const event = JSON.parse(raw);

    if (!event.shouldCreateCalendar) {
      return Response.json({
        success: true,
        calendar: "没有识别到需要加入日历的事件。",
      });
    }

    const appleRes = await fetch(`${baseUrl}/api/apple-calendar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    const appleData = await appleRes.json();

    return Response.json({
      success: true,
      calendar: appleData.success
        ? `已加入 Apple Calendar：${event.title}\n时间：${event.startTime}`
        : `识别到日程，但加入 Apple Calendar 失败：${appleData.error || appleData.message}`,
      event,
      apple: appleData,
    });
  } catch (error: any) {
    console.error("CALENDAR ERROR:", error);

    return Response.json({
      success: false,
      calendar: "日程识别或同步失败。",
      error: error?.message || String(error),
    });
  }
}