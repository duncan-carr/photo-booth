"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useGroupSync } from "@/hooks/useGroupSync";

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

  const { onGroupChange, broadcastPreviewStatus } = useGroupSync();

  useEffect(() => {
    const cleanup = onGroupChange(async (groupUuid) => {
      if (groupUuid) {
        setLoading(true);
        try {
          const response = await fetch(`/api/group/${groupUuid}`);
          if (response.ok) {
            const data = await response.json();
            setGroup(data);
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

  return (
    <div className="h-screen w-screen bg-black p-8 overflow-auto">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-max">
        {group.images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden bg-gray-900"
          >
            <Image
              src={`/${group.folder}/${group.uuid}/${image}`}
              alt={`Image ${index + 1}`}
              fill
              style={{ objectFit: "cover" }}
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          </div>
        ))}
      </div>
      <div className="fixed bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
        {group.images.length} {group.images.length === 1 ? "image" : "images"}
      </div>
    </div>
  );
}
