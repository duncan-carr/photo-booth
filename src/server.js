const WebSocket = require("ws");
const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs").promises;
const sharp = require("sharp");

// Create WebSocket server
const wss = new WebSocket.Server({ port: 3001 });

// Initialize variables
let activeGroup = null;
const BUFFER_DIR = path.join(process.cwd(), "public/buffer");
const DRAFT_DIR = path.join(process.cwd(), "public/draft");
const WATERMARK_PATH = path.join(process.cwd(), "public/assets/watermark.png");

// Function to apply watermark to image
async function applyWatermark(inputPath, outputPath) {
  try {
    // Load the image
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Load and resize watermark (20% of image width)
    const watermarkSize = Math.floor(metadata.width * 0.2);
    const watermark = await sharp(WATERMARK_PATH)
      .resize(watermarkSize, watermarkSize, { fit: "inside" })
      .toBuffer();

    // Calculate position for bottom-right corner with padding
    const padding = Math.floor(watermarkSize * 0.1);
    const left = metadata.width - watermarkSize - padding;
    const top = metadata.height - watermarkSize - padding;

    // Composite watermark onto image
    await image
      .composite([
        {
          input: watermark,
          top: top,
          left: left,
        },
      ])
      .toFile(outputPath);

    console.log(`Watermark applied to ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error("Error applying watermark:", error);
    throw error;
  }
}

// Set up file watcher
const watcher = chokidar.watch(BUFFER_DIR, {
  ignored: /(^|[\/\\])\../, // ignore hidden files
  persistent: true,
});

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Handle messages from client
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === "SET_ACTIVE_GROUP") {
        activeGroup = data.groupId;
        console.log(`Active group set to: ${activeGroup}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Handle new files in buffer directory
watcher.on("add", async (filePath) => {
  try {
    if (!activeGroup) {
      console.log("No active group set, file will remain in buffer");
      return;
    }

    const fileName = path.basename(filePath);
    const draftGroupDir = path.join(DRAFT_DIR, activeGroup);
    const newFilePath = path.join(draftGroupDir, fileName);

    // Ensure draft group directory exists
    await fs.mkdir(draftGroupDir, { recursive: true });

    // Wait a brief moment to ensure file is fully written
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Apply watermark and save to draft directory
    await applyWatermark(filePath, newFilePath);

    // Delete original file from buffer
    await fs.unlink(filePath);
    console.log(`Moved ${fileName} to ${activeGroup} draft folder`);

    // Notify all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "FILE_MOVED",
            fileName,
            groupId: activeGroup,
          }),
        );
      }
    });
  } catch (error) {
    console.error("Error moving file:", error);
  }
});

// Log when the watcher is ready
watcher.on("ready", () => {
  console.log("Initial scan complete. Ready for changes.");
});

// Error handling
watcher.on("error", (error) => {
  console.error("Watcher error:", error);
});

console.log("WebSocket server started on port 3001");
