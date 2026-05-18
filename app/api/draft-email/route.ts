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
你是 sana 的邮件助手。

请根据用户要求生成：

- 正式
- 自然
- 礼貌
- 简洁

的邮件。

输出格式：

收件人：
主题：
正文：
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

      email:
        completion.choices[0].message.content,

    });

  } catch {

    return Response.json({

      success: false,

      email:
        "邮件生成失败。",

    });

  }

}