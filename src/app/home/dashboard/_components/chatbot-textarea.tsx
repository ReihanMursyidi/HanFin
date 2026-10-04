import { zodResolver } from "@hookform/resolvers/zod";
import { BrainIcon, SendIcon } from "lucide-react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

const formSchema = z.object({
	message: z.string().min(1, "Message is required"),
});

export default function ChatbotTextarea({
	disabled,
	sendMessage,
	isThinking,
	setIsThinking,
	mode,
	setMode,
}: {
	disabled: boolean;
	sendMessage: (message: string) => void;
	isThinking: boolean;
	setIsThinking: Dispatch<SetStateAction<boolean>>;
	mode: "general" | "personal";
	setMode: Dispatch<SetStateAction<"general" | "personal">>;
}) {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			message: "",
		},
	});

	function onSubmit(data: z.infer<typeof formSchema>) {
		sendMessage(data.message);
		form.reset();
	}

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onSubmit(form.getValues());
		}
	}

	return (
		<form
			onSubmit={form.handleSubmit(onSubmit)}
			className="flex flex-col w-full p-3 bg-background rounded-2xl"
		>
			<Controller
				control={form.control}
				name="message"
				render={({ field }) => (
					<Field>
						<textarea
							{...field}
							id="form-message"
							placeholder="Ask AI Advisor here"
							autoComplete="off"
							className="h-16 w-full px-3 py-2 bg-transparent resize-none focus:outline-none"
							onKeyDown={handleKeyDown}
							disabled={disabled}
						/>
					</Field>
				)}
			/>

			<div className="flex items-center justify-between mt-2">
				<div className="flex items-center gap-2">
					<Toggle
						size="sm"
						variant="outline"
						pressed={isThinking}
						onPressedChange={setIsThinking}
						className={cn(
							"text-xs px-0 py-0 h-8 w-8 border-transparent hover:border-input data-[state=on]:border-input",
							{
								"bg-primary!": isThinking,
							},
						)}
					>
						<BrainIcon className="size-4" />
					</Toggle>
					<Select
						value={mode}
						onValueChange={(value: "general" | "personal") => setMode(value)}
					>
						<SelectTrigger size="sm" className="capitalize!">
							<SelectValue>{mode}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="general">General</SelectItem>
							<SelectItem value="personal">Personal</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div>
					<Button
						type="submit"
						size="icon"
						variant="ghost"
						disabled={disabled}
						className="cursor-pointer text-foreground hover:bg-secondary hover:text-foreground disabled:bg-transparent"
					>
						<SendIcon className="size-5" />
					</Button>
				</div>
			</div>
		</form>
	);
}
