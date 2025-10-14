import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export async function POST(request: Request) {
  const { uuid, ids } = await request.json();
  const dirPath = path.join(process.cwd(), "public", "draft", uuid);

  try {
    fs.mkdirSync(dirPath, { recursive: true });
    const meta = {
      ids,
      createdAt: new Date().toISOString(),
    };
    const filePath = path.join(dirPath, "meta.json");
    fs.writeFileSync(filePath, JSON.stringify(meta, null, 2));
    return NextResponse.json(
      { message: "Directory and meta.json created" },
      { status: 201 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to create directory or file" },
      { status: 500 },
    );
  }
}
