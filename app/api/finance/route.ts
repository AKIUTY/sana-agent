import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const response = await fetch(
      "https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC,AAPL,NVDA,BTC-USD&region=US&lang=en-US"
    );

    const text = await response.text();

    const matches = [...text.matchAll(/<title>(.*?)<\/title>/g)];

    const news = matches
      .map((item) => item[1])
      .filter(
        (title) =>
          !title.includes("Yahoo") &&
          title.length > 10
      )
      .slice(0, 5);

    const completion =
      await openai.chat.completions.create({

        model: "gpt-4.1-mini",

        messages: [
          {
            role: "system",
            content:
              "你是 SANA 的财经摘要模块。请把英文财经新闻整理成简洁自然的中文摘要。不要像新闻联播。",
          },
          {
            role: "user",
            content:
              `请整理这些财经新闻：\n\n${news.join("\n")}`,
          },
        ],

      });

    return Response.json({
      success: true,
      summary:
        completion.choices[0].message.content,
    });

  } catch {

    return Response.json({
      success: false,
      summary:
        "财经系统暂时不可用。",
    });

  }
}