"use client";

import { useEffect, useRef } from "react";

export const useWebSocket = () => {
	const wsRef = useRef<WebSocket | null>(null);

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

		return () => {
			wsRef.current?.close();
		};
	}, []);

	const setActiveGroup = (groupId: string | null) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			wsRef.current.send(
				JSON.stringify({
					type: "SET_ACTIVE_GROUP",
					groupId,
				})
			);
		}
	};

	return { setActiveGroup };
};
