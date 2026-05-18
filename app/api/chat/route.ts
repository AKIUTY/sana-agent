import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const memoryPath = path.join(
  process.cwd(),
  "memory",
  "profile.json"
);

async function autoRemember(text: string) {
  try {
    const currentMemory = JSON.parse(
      fs.readFileSync(memoryPath, "utf-8")
    );

    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages: [

          {
            role: "system",
            content: `
你是 sana 的记忆判断模块。

判断用户的话是否值得长期记住。

只记住：
- 长期偏好
- 固定联系人
- 学校/工作
- 长期项目
- 长期习惯

不要记短期内容。

只返回 JSON。

格式：

{
  "shouldRemember": true,
  "category": "notes",
  "content": "..."
}

或者：

{
  "shouldRemember": false
}
`,
          },

          {
            role: "user",
            content: text,
          },

        ],

      });

    const raw =
      completion.choices[0].message.content || "{}";

    const extracted =
      JSON.parse(raw);

    if (!extracted.shouldRemember)
      return;

    const category =
      extracted.category || "notes";

    if (!currentMemory[category]) {
      currentMemory[category] = [];
    }

    currentMemory[category].push(
      extracted.content
    );

    fs.writeFileSync(
      memoryPath,
      JSON.stringify(
        currentMemory,
        null,
        2
      )
    );

  } catch (error) {

    console.error(
      "AUTO MEMORY ERROR:",
      error
    );

  }
}

export async function POST(req: Request) {

  try {

    const body =
      await req.json();

    await autoRemember(
      body.message
    );

    let memory = {};

    try {

      const memoryData =
        fs.readFileSync(
          memoryPath,
          "utf-8"
        );

      memory =
        JSON.parse(memoryData);

    } catch {

      memory = {};

    }

    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages: [

          {
            role: "system",
            content: `
你是 sana。

你是一个自然、聪明、有长期记忆能力的私人AI助理。

以下是用户长期记忆：

${JSON.stringify(memory, null, 2)}

说话方式：
- 默认中文
- 自然
- 温柔
- 不像客服
- 简洁
- 有陪伴感
- 会主动利用记忆帮助用户
`,
          },

          {
            role: "user",
            content: body.message,
          },

        ],

      });

    return Response.json({

      reply:
        completion.choices[0].message.content,

    });

  } catch (error) {

    console.error(error);

    return Response.json({

      reply:
        "sana 当前无法连接。",

    });

  }

}