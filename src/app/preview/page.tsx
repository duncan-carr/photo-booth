"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useGroupSync } from "@/hooks/useGroupSync";
import { useWebSocket } from "@/hooks/useWebSocket";

interface Group {
  uuid: string;
  createdAt: string;
  ids: string[];
  images: string[];
  folder: "draft" | "sent" | "trash";
}

export default function PreviewPage() {
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  const { onGroupChange, broadcastPreviewStatus } = useGroupSync();

  // Listen for new images being added via WebSocket
  useWebSocket((fileName, movedGroupId) => {
    // Refresh the group data if a file was moved to the currently previewed group
    if (group && movedGroupId === group.uuid) {
      const fetchGroup = async () => {
        try {
          const response = await fetch(`/api/group/${group.uuid}`);
          if (response.ok) {
            const data = await response.json();
            setGroup(data);
            // Show the most recent image when new images arrive
            if (data.images.length > 0) {
              setSelectedImageIndex(data.images.length - 1);
            }
          }
        } catch (error) {
          console.error("Failed to refresh preview after file moved", error);
        }
      };
      fetchGroup();
    }
  });

  useEffect(() => {
    const cleanup = onGroupChange(async (groupUuid) => {
      if (groupUuid) {
        setLoading(true);
        try {
          const response = await fetch(`/api/group/${groupUuid}`);
          if (response.ok) {
            const data = await response.json();
            setGroup(data);
            // Set the most recent image as selected by default
            if (data.images.length > 0) {
              setSelectedImageIndex(data.images.length - 1);
            }
            // Notify dashboard that preview is active
            broadcastPreviewStatus(true, groupUuid);
          } else {
            console.error("Failed to fetch group");
            setGroup(null);
            broadcastPreviewStatus(false, null);
          }
        } catch (error) {
          console.error("Failed to fetch group", error);
          setGroup(null);
          broadcastPreviewStatus(false, null);
        } finally {
          setLoading(false);
        }
      } else {
        setGroup(null);
        broadcastPreviewStatus(false, null);
      }
    });

    return cleanup;
  }, [onGroupChange, broadcastPreviewStatus]);

  // Broadcast that preview is active on mount and inactive on unmount
  useEffect(() => {
    if (group) {
      broadcastPreviewStatus(true, group.uuid);
    }

    return () => {
      broadcastPreviewStatus(false, null);
    };
  }, [group, broadcastPreviewStatus]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">
          Select a group from the dashboard to preview
        </div>
      </div>
    );
  }

  if (group.images.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center">
        <div className="text-white text-2xl">No images in this group</div>
      </div>
    );
  }

  const selectedImage = group.images[selectedImageIndex];

  return (
    <div className="h-screen w-screen bg-black flex flex-col p-8 overflow-hidden">
      {/* Main preview area */}
      <div className="flex-1 relative rounded-lg overflow-hidden bg-gray-900 mb-6">
        <Image
          src={`/${group.folder}/${group.uuid}/${selectedImage}`}
          alt={`Image ${selectedImageIndex + 1}`}
          fill
          style={{ objectFit: "contain" }}
          sizes="100vw"
          unoptimized
          key={`${selectedImage}-${group.images.length}`}
        />
      </div>

      {/* Thumbnail strip at bottom */}
      <div className="h-32 flex gap-4 overflow-x-auto pb-2">
        {group.images.map((image, index) => (
          <button
            key={`${image}-${group.images.length}`}
            onClick={() => setSelectedImageIndex(index)}
            className={`relative shrink-0 w-48 h-full rounded-lg overflow-hidden transition-all ${
              index === selectedImageIndex
                ? "ring-4 ring-white scale-105"
                : "ring-2 ring-gray-600 opacity-60 hover:opacity-100 hover:ring-gray-400"
            }`}
          >
            <Image
              src={`/${group.folder}/${group.uuid}/${image}`}
              alt={`Thumbnail ${index + 1}`}
              fill
              style={{ objectFit: "cover" }}
              sizes="200px"
              unoptimized
            />
          </button>
        ))}
      </div>

      {/* Image counter */}
      <div className="fixed top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
        {selectedImageIndex + 1} / {group.images.length}
      </div>
    </div>
  );
}
