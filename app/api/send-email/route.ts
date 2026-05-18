import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const transporter = nodemailer.createTransport({
      host: "smtp.163.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER!,
      to: body.to,
      subject: body.subject,
      text: body.text,
    });

    return Response.json({
      success: true,
      message: "邮件已发送。",
    });
  } catch (error: any) {
    console.error("SEND EMAIL ERROR:", error);

    return Response.json({
      success: false,
      message: "邮件发送失败。",
      error: error?.message || String(error),
    });
  }
}