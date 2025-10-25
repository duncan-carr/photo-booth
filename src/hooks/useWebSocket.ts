"use client";

import { useEffect, useRef } from "react";

type OnFileMoved = (fileName: string, groupId: string) => void;

export const useWebSocket = (onFileMoved?: OnFileMoved) => {
  const wsRef = useRef<WebSocket | null>(null);
  const onFileMovedRef = useRef<OnFileMoved | undefined>(onFileMoved);

  // Update the ref whenever the callback changes
  useEffect(() => {
    onFileMovedRef.current = onFileMoved;
  }, [onFileMoved]);

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:3001");

    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current.onclose = () => {
      console.log("Disconnected from WebSocket server");
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "FILE_MOVED" && onFileMovedRef.current) {
          onFileMovedRef.current(data.fileName, data.groupId);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, []); // Empty dependency array - only connect once

  const setActiveGroup = (groupId: string | null) => {
    const sendMessage = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "SET_ACTIVE_GROUP",
            groupId,
          }),
        );
      } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
        // Wait for connection to open
        const openHandler = () => {
          wsRef.current?.send(
            JSON.stringify({
              type: "SET_ACTIVE_GROUP",
              groupId,
            }),
          );
          wsRef.current?.removeEventListener("open", openHandler);
        };
        wsRef.current?.addEventListener("open", openHandler);
      }
    };

    sendMessage();
  };

  return { setActiveGroup };
};
