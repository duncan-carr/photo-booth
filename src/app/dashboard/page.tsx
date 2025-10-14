"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { NewGroupButton } from "@/components/new-group";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Info,
  Send,
  Trash2,
  Camera,
  RotateCcw,
  Monitor,
  MonitorOff,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useGroups } from "@/contexts/GroupContext";
import { useRouter } from "next/navigation";
import { useGroupSync } from "@/hooks/useGroupSync";
import { Badge } from "@/components/ui/badge";

interface Group {
  uuid: string;
  createdAt: string;
  ids: string[];
  images: string[];
  folder: "draft" | "sent" | "trash";
}

export default function Page() {
  const searchParams = useSearchParams();

  const groupUuid = searchParams.get("group");

  const [group, setGroup] = useState<Group | null>(null);

  const [loading, setLoading] = useState(true);

  const [isPreviewActive, setIsPreviewActive] = useState(false);

  const [previewingGroupUuid, setPreviewingGroupUuid] = useState<string | null>(
    null,
  );

  const [previewEnabled, setPreviewEnabled] = useState(true);

  const { groups, fetchGroups } = useGroups();

  const router = useRouter();

  const { broadcastGroupSelection, onPreviewStatusChange } = useGroupSync();

  const selectedGroup = useMemo(() => {
    if (!groupUuid) return null;

    const allGroups = [...groups.drafts, ...groups.sent, ...groups.trash];

    return allGroups.find((g) => g.uuid === groupUuid);
  }, [groupUuid, groups]);

  useEffect(() => {
    if (groupUuid) {
      setLoading(true);

      const fetchGroup = async () => {
        try {
          const response = await fetch(`/api/group/${groupUuid}`);

          if (response.ok) {
            const data = await response.json();

            setGroup(data);

            // Broadcast the selected group to preview page if preview is enabled
            if (previewEnabled) {
              broadcastGroupSelection(groupUuid);
            }
          } else {
            console.error("Failed to fetch group");

            setGroup(null);

            if (previewEnabled) {
              broadcastGroupSelection(null);
            }
          }
        } catch (error) {
          console.error("Failed to fetch group", error);

          setGroup(null);

          if (previewEnabled) {
            broadcastGroupSelection(null);
          }
        } finally {
          setLoading(false);
        }
      };

      fetchGroup();
    } else {
      setGroup(null);

      setLoading(false);

      if (previewEnabled) {
        broadcastGroupSelection(null);
      }
    }
  }, [groupUuid, broadcastGroupSelection, previewEnabled]);

  // Listen for preview status updates
  useEffect(() => {
    const cleanup = onPreviewStatusChange((isActive, groupUuid) => {
      setIsPreviewActive(isActive);
      setPreviewingGroupUuid(groupUuid);
    });

    return cleanup;
  }, [onPreviewStatusChange]);

  const togglePreview = () => {
    const newPreviewEnabled = !previewEnabled;
    setPreviewEnabled(newPreviewEnabled);

    if (newPreviewEnabled && groupUuid) {
      // Re-broadcast current group when enabling preview
      broadcastGroupSelection(groupUuid);
    } else if (!newPreviewEnabled) {
      // Clear preview when disabling
      broadcastGroupSelection(null);
    }
  };

  const handleMoveGroup = async (
    action: "send" | "delete" | "restore" | "re-draft",
  ) => {
    if (!group) return;

    try {
      const response = await fetch(`/api/group/${group.uuid}/move`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        await fetchGroups();

        if (action === "send") {
          setGroup({ ...group, folder: "sent" });
        } else if (action === "re-draft" || action === "restore") {
          setGroup({ ...group, folder: "draft" });

          const params = new URLSearchParams(searchParams.toString());

          params.set("view", "drafts");

          router.push(`/dashboard?${params.toString()}`);
        } else {
          router.push("/dashboard");
        }
      } else {
        console.error(`Failed to ${action} group`);
      }
    } catch (error) {
      console.error(`Failed to ${action} group`, error);
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />

      <SidebarInset>
        <header className="bg-background sticky top-0 flex justify-between shrink-0 items-center gap-2 border-b p-4">
          <div className="flex items-center gap-2">
            <NewGroupButton />
            {isPreviewActive && previewingGroupUuid === groupUuid && (
              <Badge
                variant="secondary"
                className="text-xs flex items-center gap-1"
              >
                <Monitor className="h-3 w-3" />
                Previewing
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={previewEnabled ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={togglePreview}
            >
              {previewEnabled ? (
                <>
                  <Monitor className="scale-75" />
                  Preview On
                </>
              ) : (
                <>
                  <MonitorOff className="scale-75" />
                  Preview Off
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Info className="scale-75"></Info>
              Directions
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {loading && selectedGroup ? (
            <div className="flex gap-2 mb-4">
              <div className="h-8 w-20 rounded-md bg-muted/50 animate-pulse" />
              <div className="h-8 w-20 rounded-md bg-muted/50 animate-pulse" />
            </div>
          ) : (
            group && (
              <div className="flex gap-2 mb-4">
                {group.folder === "draft" && (
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => handleMoveGroup("send")}
                  >
                    <Send className="scale-75" /> Send
                  </Button>
                )}

                {group.folder === "sent" && (
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => handleMoveGroup("re-draft")}
                  >
                    <Camera className="scale-75" /> Take more pictures
                  </Button>
                )}

                {(group.folder === "draft" || group.folder === "sent") && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleMoveGroup("delete")}
                  >
                    <Trash2 className="scale-75" /> Delete
                  </Button>
                )}

                {group.folder === "trash" && (
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={() => handleMoveGroup("restore")}
                  >
                    <RotateCcw className="scale-75" /> Restore
                  </Button>
                )}
              </div>
            )
          )}

          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: selectedGroup?.imageCount || 0 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="relative aspect-video rounded-lg overflow-hidden bg-muted/50 animate-pulse"
                  />
                ),
              )}
            </div>
          ) : group ? (
            group.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {group.images.map((image, index) => (
                  <div
                    key={index}
                    className="relative aspect-video rounded-lg overflow-hidden"
                  >
                    <Image
                      src={`/${group.folder}/${group.uuid}/${image}`}
                      alt={`Image ${index + 1}`}
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">
                <p>No images in this group yet</p>
              </div>
            )
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <p>Select a group to view its content</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
