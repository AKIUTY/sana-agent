import OpenAI from "openai";
import mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({
        success: false,
        summary: "没有收到文件。",
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = "";

    if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const data = await mammoth.extractRawText({ buffer });
      text = data.value;
    } else {
      text = buffer.toString("utf-8");
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "你是 sana 的文件阅读模块。请用中文总结文件重点，并提取待办、deadline、重要要求和需要注意的地方。",
        },
        {
          role: "user",
          content: text.slice(0, 12000),
        },
      ],
    });

    return Response.json({
      success: true,
      filename: file.name,
      summary: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error(error);

    return Response.json({
      success: false,
      summary: "文件读取失败。",
      error: error?.message || String(error),
    });
  }
}