import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
	host: "smtp.mail.me.com",
	port: 587,
	secure: false, // true for 465, false for other ports
	auth: {
		user: process.env.NEXT_PUBLIC_EMAIL,
		pass: process.env.NEXT_PUBLIC_PASSWORD,
	},
});

function getMailOptions(uuid: string) {
	return {
		from: process.env.NEXT_PUBLIC_EMAIL,
		to: getEmails(uuid),
		subject: "Haunted House Photos",
		text: "Thanks for coming to the Wyckoff Haunted House 2025! Your photos from the event are attached to this email.",
		attachments: getAttachments(uuid),
	};
}

function getEmails(uuid: string): string[] {
	const groupInfo = findGroupPath(uuid);
	if (!groupInfo) {
		return [];
	}

	const metaPath = path.join(groupInfo.groupPath, "meta.json");
	if (!fs.existsSync(metaPath)) {
		return [];
	}

	try {
		// Read and parse meta.json to get IDs
		const metaContent = fs.readFileSync(metaPath, "utf-8");
		const meta = JSON.parse(metaContent);
		const ids = meta.ids;

		// Read and parse the email data CSV
		const emailDataPath = path.join(process.cwd(), "public", "emaildata.csv");
		const emailData = fs.readFileSync(emailDataPath, "utf-8");
		const emailLines = emailData.split("\n");

		// Create a map of ID to email
		const idToEmail = new Map();
		for (let i = 1; i < emailLines.length; i++) {
			const [id, email] = emailLines[i].split(",");
			if (id && email) {
				idToEmail.set(id, email.trim());
			}
		}

		// Map IDs to emails
		return ids.map((id: string) => idToEmail.get(id) || "").filter(Boolean);
	} catch (error) {
		console.error("Error reading data:", error);
		return [];
	}
}

function getAttachments(uuid: string) {
	const groupPath = findGroupPath(uuid);
	// Get all files in the groupPath directory
	const files = fs.readdirSync(groupPath?.groupPath ?? "");
	// Filter for image files (common extensions)
	const imageExtensions = [
		".jpg",
		".jpeg",
		".png",
		".gif",
		".bmp",
		".webp",
		".tiff",
	];
	const images = files.filter((file) =>
		imageExtensions.includes(path.extname(file).toLowerCase())
	);
	// Return array of objects with path property set to absolute path
	return images.map((file) => ({
		path: path.join(findGroupPath(uuid)?.groupPath ?? "", file),
	}));
}

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

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ uuid: string }> }
) {
	const uuid = (await params).uuid;
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
					{ status: 400 }
				);
			}

			newFolder = "sent";
			break;
		case "delete":
			if (folder !== "draft" && folder !== "sent") {
				return NextResponse.json(
					{ message: "Group cannot be deleted" },
					{ status: 400 }
				);
			}
			newFolder = "trash";
			break;
		case "restore":
			if (folder !== "trash") {
				return NextResponse.json(
					{ message: "Group is not in trash" },
					{ status: 400 }
				);
			}
			newFolder = "draft";
			break;
		case "re-draft":
			if (folder !== "sent") {
				return NextResponse.json(
					{ message: "Group is not a sent group" },
					{ status: 400 }
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
		if (action == "send") {
			transporter.sendMail(getMailOptions(uuid), (error, info) => {
				if (error) {
					console.error("Error:", error);
				} else {
					console.log("Email sent:", info.response);
				}
			});
		}
		return NextResponse.json({ message: `Group moved to ${newFolder}` });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: "Failed to move group" },
			{ status: 500 }
		);
	}
}
