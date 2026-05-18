import { ImapFlow } from "imapflow";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getEmails(user: string, pass: string, host: string) {
  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: {
      user,
      pass,
    },
  });

  await client.connect();
  await client.mailboxOpen("INBOX");

  const emails = [];

  for await (const msg of client.fetch("1:*", {
    envelope: true,
  })) {
    emails.push({
      subject: msg.envelope?.subject || "无主题",
      from: msg.envelope?.from?.[0]?.address || "未知发件人",
      date: msg.envelope?.date || "",
    });
  }

  await client.logout();

  return emails.slice(-5).reverse();
}

export async function GET() {
  try {
    const mailbox1 = await getEmails(
      process.env.EMAIL_USER!,
      process.env.EMAIL_PASS!,
      process.env.IMAP_HOST || "imap.163.com"
    );

    const mailbox2 = await getEmails(
      process.env.EMAIL2_USER!,
      process.env.EMAIL2_PASS!,
      process.env.EMAIL2_HOST || "imap.163.com"
    );

    const emails = [...mailbox1, ...mailbox2];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "你是 sana 的邮件总结模块。请用中文总结这些邮件，语气自然、简洁，重点提取重要事项、风险、验证码、物流和需要处理的内容。",
        },
        {
          role: "user",
          content: JSON.stringify(emails, null, 2),
        },
      ],
    });

    return Response.json({
      success: true,
      emails,
      summary: completion.choices[0].message.content,
    });
  } catch (error: any) {
    console.error(error);

    return Response.json({
      success: false,
      emails: [],
      summary: "邮件总结失败。",
      error: error?.message || String(error),
    });
  }
}