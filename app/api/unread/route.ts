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

  await client.mailboxOpen("INBOX");

  let count = 0;

  for await (const message of client.fetch("1:*", {
    flags: true,
  })) {
    const flags = Array.from(message.flags || []);

    if (!flags.includes("\\Seen")) {
      count++;
    }
  }

  await client.logout();

  return count;
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
  } catch (error: any) {
    console.error(error);

    return Response.json({
      success: false,
      first: 0,
      second: 0,
      total: 0,
      error: error?.message || String(error),
    });
  }
}