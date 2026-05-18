import { ImapFlow } from "imapflow";

async function getUnreadCount(user: string, pass: string, host: string) {
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

  const mailbox = await client.mailboxOpen("INBOX");

  await client.logout();

  return mailbox.unseen || 0;
}

export async function GET() {
  try {
    const first = await getUnreadCount(
      process.env.EMAIL_USER!,
      process.env.EMAIL_PASS!,
      process.env.IMAP_HOST || "imap.163.com"
    );

    const second = await getUnreadCount(
      process.env.EMAIL2_USER!,
      process.env.EMAIL2_PASS!,
      process.env.EMAIL2_HOST || "imap.163.com"
    );

    return Response.json({
      success: true,
      first,
      second,
      total: first + second,
    });
  } catch {
    return Response.json({
      success: false,
      first: 0,
      second: 0,
      total: 0,
      error: "Unread system failed.",
    });
  }
}