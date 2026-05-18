import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ToolName =
  | "email_summary"
  | "tasks"
  | "calendar"
  | "brief"
  | "finance"
  | "weather"
  | "chat";

async function callTool(tool: ToolName, input: string) {
  if (tool === "email_summary") {
    const res = await fetch("http://localhost:3000/api/summary");
    const data = await res.json();
    return data.summary || "邮件总结暂时不可用。";
  }

  if (tool === "tasks") {
    const res = await fetch("http://localhost:3000/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: input }),
    });

    const data = await res.json();
    return data.tasks || "待办生成失败。";
  }

  if (tool === "calendar") {
    const res = await fetch("http://localhost:3000/api/calendar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: input }),
    });

    const data = await res.json();
    return data.calendar || "日程识别失败。";
  }

  if (tool === "brief") {
    const res = await fetch("http://localhost:3000/api/brief");
    const data = await res.json();
    return data.summary || "今日总结暂时不可用。";
  }

  if (tool === "finance") {
    const res = await fetch("http://localhost:3000/api/finance");
    const data = await res.json();
    return data.summary || "财经摘要暂时不可用。";
  }

  if (tool === "weather") {
    const res = await fetch("http://localhost:3000/api/weather");
    const data = await res.json();
    return `${data.city} · ${data.temperature}°C · ${data.weather}`;
  }

  return "无需调用工具。";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = body.message;

    const planner = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
你是 sana 的多步骤任务规划模块。

你需要根据用户请求，决定需要调用哪些工具。

可用工具：
- email_summary：读取并总结邮件
- tasks：根据邮件和用户输入生成待办
- calendar：识别用户输入中的日程、会议、deadline
- brief：生成今日总结
- finance：获取财经摘要
- weather：获取天气
- chat：普通聊天

规则：
1. 可以选择多个工具。
2. 如果用户说“帮我准备今天/明天/下周”，通常需要 brief、email_summary、tasks、calendar。
3. 如果用户只是聊天，就只用 chat。
4. 不要选择发送邮件、写入日历这种高风险动作。
5. 只返回 JSON，不要解释。

返回格式：
{
  "tools": ["brief", "email_summary", "tasks"],
  "reason": "原因"
}
`,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
    });

    const raw = planner.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw);

    const tools: ToolName[] =
      Array.isArray(parsed.tools) && parsed.tools.length > 0
        ? parsed.tools
        : ["chat"];

    if (tools.includes("chat") && tools.length === 1) {
      const chat = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "你是 sana，一个自然、有温度、聪明的私人AI助理。默认中文，简洁，有陪伴感。",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      return Response.json({
        success: true,
        mode: "chat",
        reply: chat.choices[0].message.content,
      });
    }

    const results: { tool: string; result: string }[] = [];

    for (const tool of tools) {
      if (tool === "chat") continue;

      const result = await callTool(tool, userMessage);

      results.push({
        tool,
        result,
      });
    }

    const finalAnswer = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
你是 sana，一个私人AI助理。

你刚刚调用了多个工具。
现在请把这些工具结果整合成一个自然、清晰、有用的中文回复。

要求：
- 不要说“我调用了工具”
- 不要机械列接口名
- 像私人助理一样总结
- 给用户下一步建议
- 简洁但有条理
`,
        },
        {
          role: "user",
          content: `
用户请求：
${userMessage}

工具结果：
${JSON.stringify(results, null, 2)}
`,
        },
      ],
    });

    return Response.json({
      success: true,
      mode: "multi-step",
      tools,
      reply: finalAnswer.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      reply: "sana 多步骤任务处理失败。",
    });
  }
}