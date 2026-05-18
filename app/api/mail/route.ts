import { ImapFlow } from "imapflow";

export async function GET() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT),
    secure: true,

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await client.connect();

  let lock = await client.getMailboxLock("INBOX");

  try {
    const emails = [];

    for await (const message of client.fetch("1:*", {
      envelope: true,
    })) {
      emails.push({
        subject: message.envelope.subject,
        from: message.envelope.from?.[0]?.address,
        date: message.envelope.date,
      });
    }

    return Response.json({
      success: true,
      emails: emails.slice(-5).reverse(),
    });
  } finally {
    lock.release();
    await client.logout();
  }
}