"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface Group {
  uuid: string;
  createdAt: Date;
  ids: string[];
  imageCount: number;
}

interface GroupContextType {
  groups: {
    drafts: Group[];
    sent: Group[];
    trash: Group[];
  };
  fetchGroups: () => Promise<void>;
  optimisticallyAddGroup: (group: Group) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<{
    drafts: Group[];
    sent: Group[];
    trash: Group[];
  }>({
    drafts: [],
    sent: [],
    trash: [],
  });

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else {
        console.error("Failed to fetch groups");
      }
    } catch (error) {
      console.error("Failed to fetch groups", error);
    }
  };

  const optimisticallyAddGroup = (group: Group) => {
    setGroups((prevGroups) => ({
      ...prevGroups,
      drafts: [group, ...prevGroups.drafts],
    }));
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <GroupContext.Provider
      value={{ groups, fetchGroups, optimisticallyAddGroup }}
    >
      {children}
    </GroupContext.Provider>
  );
}

export function useGroups() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroups must be used within a GroupProvider");
  }
  return context;
}
