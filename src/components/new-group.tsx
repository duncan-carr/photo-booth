"use client";

import { Plus, PlusCircle, X } from "lucide-react";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { useState } from "react";
import { Badge } from "./ui/badge";

import { useRouter } from "next/navigation";
import { DialogClose } from "@/components/ui/dialog";

function handleInputChange(
	event: React.ChangeEvent<HTMLInputElement>,
	ids: string[],
	setIds: React.Dispatch<React.SetStateAction<string[]>>
) {
	console.log("handleInputChange called");

	const value = event.target.value.trim();

	console.log("value:", value);

	if (value.length === 14) {
		event.target.value = "";
		if (!ids.includes(value.slice(6, 12))) {
			setIds([...ids, value.slice(6, 12)]);
		}
	}
}

import { useGroups } from "../contexts/GroupContext";

export function NewGroupButton() {
	const [ids, setIds] = useState<string[]>([]);
	const [open, setOpen] = useState(false);
	const router = useRouter();
	const { fetchGroups, optimisticallyAddGroup } = useGroups();

	const handleBadgeClick = (idToRemove: string) => {
		setIds(ids.filter((id) => id !== idToRemove));
	};

	const handleCreateGroup = async () => {
		const uuid = crypto.randomUUID();
		const newGroup = {
			uuid,
			createdAt: new Date(),
			ids,
			imageCount: 0,
		};

		optimisticallyAddGroup(newGroup);
		setOpen(false);
		router.push(`/dashboard?group=${uuid}`);

		try {
			const response = await fetch("/api/create-group", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ uuid, ids }),
			});
			if (response.ok) {
				console.log("Group created successfully");
			} else {
				console.error("Failed to create group");
			}
		} catch (error) {
			console.error("Failed to create group", error);
		} finally {
			await fetchGroups();
		}
	};

	function manualInputEnterKey() {
		{
			const input = document.getElementById("ids") as HTMLInputElement | null;
			if (!input) return;

			const value = input.value.trim();
			if (!value) return;

			if (!ids.includes(value)) {
				setIds([...ids, value]);
			}

			// Clear the input for the next entry
			input.value = "";
			input.focus();
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="text-xs">
					<Plus className="scale-75"></Plus> New Group
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create New Group</DialogTitle>
					<DialogDescription>
						Scan the IDs of the people in the group to add them.
					</DialogDescription>
				</DialogHeader>
				<div className="w-full flex flex-col gap-2">
					<div className="flex flex-col gap-1 w-full">
						<Label htmlFor="ids">
							Ensure this input is selected, then scan each ID.
						</Label>
						<div className="flex gap-2">
							<Input
								id="ids"
								className="w-full"
								onChange={(e) => handleInputChange(e, ids, setIds)}
								onKeyDown={(e) => {
									if (e.key == "Enter") {
										manualInputEnterKey();
									}
								}}
							/>
							<Button
								onClick={manualInputEnterKey}
								type="button"
								variant={"outline"}
							>
								<PlusCircle />
							</Button>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{ids.map((id, index) => (
							<Badge
								className="hover:bg-red-600 transition-all duration-100 cursor-pointer"
								key={index}
								onClick={() => handleBadgeClick(id)}
							>
								<X></X>
								{id}
							</Badge>
						))}
					</div>
				</div>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" onClick={handleCreateGroup}>
						Create Group
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
