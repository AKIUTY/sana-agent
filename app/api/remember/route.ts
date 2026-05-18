import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const memoryPath = path.join(process.cwd(), "memory", "profile.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const currentMemory = JSON.parse(
      fs.readFileSync(memoryPath, "utf-8")
    );

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `
你是 sana 的记忆提取模块。

你的任务是判断用户说的话是否值得长期记住。

只记住长期有用的信息，例如：
- 用户的学校
- 用户的偏好
- 用户的重要联系人
- 用户的固定习惯
- 用户的邮箱用途
- 用户的长期项目
- 用户的课程/工作相关信息

不要记住短期、无意义、隐私过度的信息。

请只返回 JSON，不要解释。

格式：
{
  "shouldRemember": true,
  "category": "preferences | important_contacts | notes",
  "content": "要保存的内容"
}

如果不值得记住：
{
  "shouldRemember": false
}
`,
        },
        {
          role: "user",
          content: body.text,
        },
      ],
    });

    const raw = completion.choices[0].message.content || "{}";
    const extracted = JSON.parse(raw);

    if (!extracted.shouldRemember) {
      return Response.json({
        success: true,
        remembered: false,
      });
    }

    const category = extracted.category || "notes";

    if (!currentMemory[category]) {
      currentMemory[category] = [];
    }

    currentMemory[category].push(extracted.content);

    fs.writeFileSync(
      memoryPath,
      JSON.stringify(currentMemory, null, 2)
    );

    return Response.json({
      success: true,
      remembered: true,
      memory: currentMemory,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "Memory extraction failed.",
    });
  }
}