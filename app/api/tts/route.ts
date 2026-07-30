import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "sage",
      input: body.text,
      instructions:
        "用冷静、干练、清晰的中文女声朗读，像一位专业的私人经纪人。语速利落，吐字干净，语气沉稳、有分寸、略带距离感，不谄媚、不夸张、不上扬。",
      response_format: "mp3",
    });

    const buffer = Buffer.from(await audio.arrayBuffer());

    return new Response(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch {
    return Response.json({
      success: false,
      error: "经纪人 voice failed.",
    });
  }
}