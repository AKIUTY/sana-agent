import { ImapFlow } from "imapflow";

export async function GET() {
  try {
    const client = new ImapFlow({
      host: process.env.IMAP_HOST || "imap.163.com",
      port: Number(process.env.IMAP_PORT || 993),
      secure: true,
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    });

    await client.connect();

    const mailbox = await client.mailboxOpen("INBOX");

    const emails = [];

    for await (const message of client.fetch("1:*", {
      envelope: true,
    })) {
      emails.push({
        subject: message.envelope?.subject || "无主题",
        from: message.envelope?.from?.[0]?.address || "未知发件人",
        date: message.envelope?.date || "",
      });
    }

    await client.logout();

    return Response.json({
      success: true,
      total: mailbox.exists,
      emails: emails.slice(-5).reverse(),
    });
  } catch (error: any) {
    console.error(error);

    return Response.json({
      success: false,
      error: error?.message || "Mail system failed.",
    });
  }
}