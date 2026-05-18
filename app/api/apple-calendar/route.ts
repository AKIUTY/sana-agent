import {
  createDAVClient,
  DAVCalendar,
} from "tsdav";

export async function POST(req: Request) {

  try {

    const body = await req.json();

    const client =
      await createDAVClient({

        serverUrl:
          "https://caldav.icloud.com",

        credentials: {

          username:
            process.env.APPLE_ID!,

          password:
            process.env.APPLE_APP_PASSWORD!,

        },

        authMethod:
          "Basic",

        defaultAccountType:
          "caldav",

      });

    const calendars =
      await client.fetchCalendars();

    const calendar =
      calendars[0] as DAVCalendar;

    const start =
      new Date();

    const end =
      new Date(
        start.getTime() +
        60 * 60 * 1000
      );

    const event = `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:${body.title}
DESCRIPTION:${body.description || ""}
DTSTART:${start
  .toISOString()
  .replace(/[-:]/g, "")
  .split(".")[0]}Z
DTEND:${end
  .toISOString()
  .replace(/[-:]/g, "")
  .split(".")[0]}Z
END:VEVENT
END:VCALENDAR
`;

    await client.createCalendarObject({

      calendar,

      filename:
        `sana-${Date.now()}.ics`,

      iCalString:
        event,

    });

    return Response.json({

      success: true,

      message:
        "已加入 Apple Calendar",

    });

  } catch (error) {

    console.error(error);

    return Response.json({

      success: false,

      message:
        "Apple Calendar 添加失败",

    });

  }

}