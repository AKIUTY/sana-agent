import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages: [

          {
            role: "system",
            content:
              `
你是 sana 的日程识别模块。

请从用户内容中识别：

- 日期
- 时间
- 事件

并整理成：

📅 日期
⏰ 时间
📝 事件

如果没有明确时间，就猜测最合理时间。
`,
          },

          {
            role: "user",
            content: body.text,
          },

        ],

      });

    return Response.json({

      success: true,

      calendar:
        completion.choices[0].message.content,

    });

  } catch {

    return Response.json({

      success: false,

      calendar:
        "暂时无法生成日程。",

    });

  }

}