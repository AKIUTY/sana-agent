import OpenAI from "openai";
import mammoth from "mammoth";

const pdfParse = require("pdf-parse");

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

    // PDF
    if (file.type === "application/pdf") {

      const data = await pdfParse(buffer);

      text = data.text;

    }

    // Word
    else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {

      const data =
        await mammoth.extractRawText({
          buffer,
        });

      text = data.value;

    }

    // TXT
    else {

      text =
        buffer.toString("utf-8");

    }

    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages: [

          {
            role: "system",
            content:
              `
你是 sana 的文件阅读模块。

请：

1. 总结文件内容
2. 提取重点
3. 提取 deadline
4. 提取待办事项
5. 提取需要注意的内容

全部用中文。
`,
          },

          {
            role: "user",
            content:
              text.slice(0, 12000),
          },

        ],

      });

    return Response.json({

      success: true,

      filename:
        file.name,

      summary:
        completion
          .choices[0]
          .message
          .content,

    });

  } catch (error) {

    console.error(error);

    return Response.json({

      success: false,

      summary:
        "文件读取失败。",

    });

  }

}