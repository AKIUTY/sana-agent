import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
你是 sana 的任务规划模块。

用户会给你一个目标。

你需要把目标拆解成清晰步骤，并判断需要用到哪些能力。

可用能力包括：
- 邮件读取
- 邮件总结
- 未读邮件检查
- 天气查询
- 财经摘要
- 文件阅读
- 待办生成
- 日程识别
- Apple Calendar 添加
- 邮件草稿
- 发送邮件
- 长期记忆
- 语音朗读

输出格式：

目标：
...

计划：
1. ...
2. ...
3. ...

需要调用的能力：
- ...

是否需要用户确认：
是 / 否
`,
        },
        {
          role: "user",
          content: body.goal,
        },
      ],
    });

    return Response.json({
      success: true,
      plan: completion.choices[0].message.content,
    });
  } catch {
    return Response.json({
      success: false,
      plan: "任务规划失败。",
    });
  }
}