"use client";

import { useEffect, useRef, useCallback } from "react";

interface GroupSyncMessage {
  type: "group-selected" | "preview-status";
  groupUuid?: string | null;
  isActive?: boolean;
  previewingGroupUuid?: string | null;
}

export function useGroupSync() {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Only create BroadcastChannel in the browser
    if (typeof window !== "undefined") {
      channelRef.current = new BroadcastChannel("group-sync");
    }

    return () => {
      channelRef.current?.close();
    };
  }, []);

  const broadcastGroupSelection = useCallback((groupUuid: string | null) => {
    if (channelRef.current) {
      const message: GroupSyncMessage = {
        type: "group-selected",
        groupUuid,
      };
      channelRef.current.postMessage(message);
    }
  }, []);

  const broadcastPreviewStatus = useCallback(
    (isActive: boolean, previewingGroupUuid: string | null) => {
      if (channelRef.current) {
        const message: GroupSyncMessage = {
          type: "preview-status",
          isActive,
          previewingGroupUuid,
        };
        channelRef.current.postMessage(message);
      }
    },
    [],
  );

  const onGroupChange = useCallback(
    (callback: (groupUuid: string | null) => void) => {
      if (!channelRef.current) return () => {};

      const handler = (event: MessageEvent<GroupSyncMessage>) => {
        if (event.data.type === "group-selected") {
          callback(event.data.groupUuid ?? null);
        }
      };

      channelRef.current.addEventListener("message", handler);

      return () => {
        channelRef.current?.removeEventListener("message", handler);
      };
    },
    [],
  );

  const onPreviewStatusChange = useCallback(
    (callback: (isActive: boolean, groupUuid: string | null) => void) => {
      if (!channelRef.current) return () => {};

      const handler = (event: MessageEvent<GroupSyncMessage>) => {
        if (event.data.type === "preview-status") {
          callback(
            event.data.isActive ?? false,
            event.data.previewingGroupUuid ?? null,
          );
        }
      };

      channelRef.current.addEventListener("message", handler);

      return () => {
        channelRef.current?.removeEventListener("message", handler);
      };
    },
    [],
  );

  return {
    broadcastGroupSelection,
    broadcastPreviewStatus,
    onGroupChange,
    onPreviewStatusChange,
  };
}
