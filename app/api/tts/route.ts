import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const audio = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "nova",
      input: body.text,
      instructions:
        "用温柔、自然、像私人助理一样的中文女声朗读。语速适中，不要夸张。",
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
      error: "SANA voice failed.",
    });
  }
}