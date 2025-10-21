import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

function findGroupPath(
	uuid: string
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

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ uuid: string }> }
) {
	const uuid = (await params).uuid;
	const groupInfo = findGroupPath(uuid);

	if (!groupInfo) {
		return NextResponse.json({ message: "Group not found" }, { status: 404 });
	}

	const { groupPath, folder } = groupInfo;
	const metaPath = path.join(groupPath, "meta.json");
	const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

	const files = fs.readdirSync(groupPath);
	const images = files.filter((file) => file !== "meta.json");

	return NextResponse.json({ ...meta, uuid, folder, images });
}
