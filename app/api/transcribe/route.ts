import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File;

    if (!audio) {
      return Response.json({
        success: false,
        text: "没有收到音频文件。",
      });
    }

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file: audio,
      language: "zh",
    });

    return Response.json({
      success: true,
      text: transcription.text,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      text: "语音识别失败。",
    });
  }
}