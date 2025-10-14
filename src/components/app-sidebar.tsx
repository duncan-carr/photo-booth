"use client";

import * as React from "react";
import { File, Frown, Info, Send, Trash2, User, Users } from "lucide-react";
import { formatDistance } from "date-fns";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Badge } from "./ui/badge";
import { Group, useGroups } from "../contexts/GroupContext";
import { useRouter, useSearchParams } from "next/navigation";

// This is sample data
const data = {
  navMain: [
    {
      title: "All Groups",
      url: "#",
      icon: Users,
      description: "All groups that are not trashed",
      isActive: true,
    },
    {
      title: "Drafts",
      url: "#",
      icon: File,
      description: "Groups that have not yet been sent",
      isActive: false,
    },
    {
      title: "Sent",
      url: "#",
      icon: Send,
      description: "Groups that have been sent",
      isActive: false,
    },
    {
      title: "Trash",
      url: "#",
      icon: Trash2,
      description: "All trashed groups and images",
      isActive: false,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeItem, setActiveItem] = React.useState(data.navMain[0]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const { groups } = useGroups();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedGroupUuid = searchParams.get("group");
  const view = searchParams.get("view") || "all-groups";

  React.useEffect(() => {
    const newActiveItem = data.navMain.find(
      (item) => item.title.toLowerCase().replace(" ", "-") === view,
    );
    if (newActiveItem) {
      setActiveItem(newActiveItem);
    }
  }, [view]);

  const handleViewChange = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    params.delete("group"); // Remove the group parameter
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleGroupSelect = (uuid: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("group", uuid);
    router.push(`/dashboard?${params.toString()}`);
  };

  let displayGroups: (Group & { folder: string })[] = [];
  if (activeItem.title === "All Groups") {
    displayGroups = [
      ...groups.drafts.map((g) => ({ ...g, folder: "Draft" })),
      ...groups.sent.map((g) => ({ ...g, folder: "Sent" })),
    ];
  } else if (activeItem.title === "Drafts") {
    displayGroups = groups.drafts.map((g) => ({ ...g, folder: "Draft" }));
  } else if (activeItem.title === "Sent") {
    displayGroups = groups.sent.map((g) => ({ ...g, folder: "Sent" }));
  } else if (activeItem.title === "Trash") {
    displayGroups = groups.trash.map((g) => ({ ...g, folder: "Trash" }));
  }

  if (searchQuery) {
    displayGroups = displayGroups.filter((group) =>
      group.ids.some((id) => id.includes(searchQuery)),
    );
  }

  displayGroups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarContent className="pt-2">
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {data.navMain.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        handleViewChange(
                          item.title.toLowerCase().replace(" ", "-"),
                        );
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Info className="text-muted-foreground scale-75"></Info>
              </TooltipTrigger>
              <TooltipContent>
                <p>{activeItem?.description}</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <SidebarInput
            placeholder="Type to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {displayGroups.length === 0 && (
                <div className="flex flex-col gap-2 items-center justify-center text-muted-foreground h-full pt-8">
                  <Frown className="scale-75"></Frown>
                  <p className="text-sm">No groups found.</p>
                </div>
              )}
              {displayGroups.map((group, groupIdx) => (
                <button
                  key={`group-${groupIdx}`}
                  onClick={() => handleGroupSelect(group.uuid)}
                  data-active={selectedGroupUuid === group.uuid}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex flex-col items-start gap-2 border-b p-4 text-sm leading-tight w-full whitespace-nowrap data-[active=true]:bg-sidebar-accent"
                >
                  <div className="flex w-full items-center gap-2">
                    <span>
                      {group.imageCount === 1
                        ? "1 image"
                        : `${group.imageCount} images`}
                    </span>{" "}
                    <Badge
                      variant={
                        group.folder === "Draft"
                          ? "default"
                          : group.folder === "Sent"
                            ? "success"
                            : "destructive"
                      }
                      className="ml-auto"
                    >
                      {group.folder}
                    </Badge>
                    <span className="ml-auto text-xs">
                      {formatDistance(new Date(group.createdAt), new Date())}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.ids.slice(0, 3).map((id, idIdx) => (
                      <Badge
                        variant="secondary"
                        className="bg-neutral-200"
                        key={`person-${groupIdx}-${idIdx}`}
                      >
                        <User className="scale-75"></User>
                        {id}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
