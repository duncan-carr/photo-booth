import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

function getGroupData(folderPath: string) {
  const groups: any[] = [];
  if (!fs.existsSync(folderPath)) {
    return groups;
  }
  const groupFolders = fs.readdirSync(folderPath);

  for (const groupFolder of groupFolders) {
    const groupPath = path.join(folderPath, groupFolder);
    const stats = fs.statSync(groupPath);

    if (stats.isDirectory()) {
      const metaPath = path.join(groupPath, "meta.json");
      let ids: string[] = [];
      let createdAt = stats.birthtime;

      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        ids = meta.ids;
        createdAt = new Date(meta.createdAt);
      }

      const files = fs.readdirSync(groupPath);
      const imageCount = files.filter((file) => file !== "meta.json").length;

      groups.push({
        uuid: groupFolder,
        createdAt,
        ids,
        imageCount,
      });
    }
  }
  return groups;
}

export async function GET() {
  const draftPath = path.join(process.cwd(), "public", "draft");
  const sentPath = path.join(process.cwd(), "public", "sent");
  const trashPath = path.join(process.cwd(), "public", "trash");

  const drafts = getGroupData(draftPath);
  const sent = getGroupData(sentPath);
  const trash = getGroupData(trashPath);

  return NextResponse.json({ drafts, sent, trash });
}
