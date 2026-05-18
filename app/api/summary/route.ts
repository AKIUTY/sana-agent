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

  const lock = await client.getMailboxLock("INBOX");

  const emails = [];

  try {
    for await (const msg of client.fetch("1:*", {
      envelope: true,
    })) {
      emails.push({
        subject: msg.envelope.subject,
        from: msg.envelope.from?.[0]?.address,
        date: msg.envelope.date,
      });
    }
  } finally {
    lock.release();
    await client.logout();
  }

  return emails.slice(-5).reverse();
}

export async function GET() {
  try {
    const emails1 = await getEmails(
      process.env.EMAIL_USER!,
      process.env.EMAIL_PASS!,
      process.env.IMAP_HOST || "imap.163.com"
    );

    const emails2 = await getEmails(
      process.env.EMAIL2_USER!,
      process.env.EMAIL2_PASS!,
      process.env.EMAIL2_HOST || "imap.163.com"
    );

    const allEmails = [
      ...emails1.map((e) => ({
        mailbox: "185Mail",
        ...e,
      })),

      ...emails2.map((e) => ({
        mailbox: "186Mail",
        ...e,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "你是 SANA，一位高级中文私人AI秘书。请总结多个邮箱的重要邮件，并提取待办事项、重要提醒、时间安排和需要回复的信息。",
        },
        {
          role: "user",
          content: `请总结以下邮件：

${JSON.stringify(allEmails, null, 2)}`,
        },
      ],
    });

    return Response.json({
      success: true,
      emails: allEmails,
      summary: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error(error);

    return Response.json({
      success: false,
      error: "SANA 双邮箱系统失败。",
    });
  }
}