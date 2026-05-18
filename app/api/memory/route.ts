import fs from "fs";
import path from "path";

const memoryPath =
  path.join(
    process.cwd(),
    "memory",
    "profile.json"
  );

export async function GET() {

  try {

    const data =
      fs.readFileSync(
        memoryPath,
        "utf-8"
      );

    return Response.json({

      success: true,

      memory:
        JSON.parse(data),

    });

  } catch {

    return Response.json({

      success: false,

      memory: {},

    });

  }

}

export async function POST(req: Request) {

  try {

    const body =
      await req.json();

    const data =
      fs.readFileSync(
        memoryPath,
        "utf-8"
      );

    const memory =
      JSON.parse(data);

    const updated = {

      ...memory,

      ...body,

    };

    fs.writeFileSync(
      memoryPath,
      JSON.stringify(
        updated,
        null,
        2
      )
    );

    return Response.json({

      success: true,

      memory: updated,

    });

  } catch {

    return Response.json({

      success: false,

    });

  }

}