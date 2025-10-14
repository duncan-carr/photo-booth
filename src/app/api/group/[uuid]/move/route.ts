import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

function findGroupPath(
  uuid: string,
): { groupPath: string; folder: string } | null {
  const folders = ["draft", "sent", "trash"];
  for (const folder of folders) {
    const groupPath = path.join(process.cwd(), "public", folder, uuid);
    if (fs.existsSync(groupPath)) {
      return { groupPath, folder };
    }
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: { uuid: string } },
) {
  const uuid = params.uuid;
  const { action } = await request.json();

  const groupInfo = findGroupPath(uuid);

  if (!groupInfo) {
    return NextResponse.json({ message: "Group not found" }, { status: 404 });
  }

  const { groupPath, folder } = groupInfo;
  let newFolder: string;

  switch (action) {
    case "send":
      if (folder !== "draft") {
        return NextResponse.json(
          { message: "Group is not a draft" },
          { status: 400 },
        );
      }
      newFolder = "sent";
      break;
    case "delete":
      if (folder !== "draft" && folder !== "sent") {
        return NextResponse.json(
          { message: "Group cannot be deleted" },
          { status: 400 },
        );
      }
      newFolder = "trash";
      break;
    case "restore":
      if (folder !== "trash") {
        return NextResponse.json(
          { message: "Group is not in trash" },
          { status: 400 },
        );
      }
      newFolder = "draft";
      break;
    case "re-draft":
      if (folder !== "sent") {
        return NextResponse.json(
          { message: "Group is not a sent group" },
          { status: 400 },
        );
      }
      newFolder = "draft";
      break;
    default:
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const newPath = path.join(process.cwd(), "public", newFolder, uuid);

  try {
    fs.renameSync(groupPath, newPath);
    return NextResponse.json({ message: `Group moved to ${newFolder}` });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to move group" },
      { status: 500 },
    );
  }
}
