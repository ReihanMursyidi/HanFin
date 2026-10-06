"use client";

import type { Dispatch, KeyboardEvent, SetStateAction } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BrainIcon, SendIcon } from "lucide-react";

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
  message: z.string().trim().min(1, "Message is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface ChatbotTextareaProps {
  disabled: boolean;
  sendMessage: (message: string) => void;
  isThinking: boolean;
  setIsThinking: Dispatch<SetStateAction<boolean>>;
  mode: "general" | "personal";
  setMode: Dispatch<SetStateAction<"general" | "personal">>;
}

export default function ChatbotTextarea({
  disabled,
  sendMessage,
  isThinking,
  setIsThinking,
  mode,
  setMode,
}: ChatbotTextareaProps) {
  // Setup React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: "" },
  });

  const { isValid } = form.formState;

  const onSubmit = (data: FormValues) => {
    sendMessage(data.message);
    form.reset();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col w-full p-3 transition-colors border shadow-sm bg-background rounded-2xl border-input/50 focus-within:border-primary/50"
    >
      <Controller
        control={form.control}
        name="message"
        render={({ field }) => (
          <Field>
            <textarea
              {...field}
              id="form-message"
              placeholder="Tanya AI Advisor di sini..."
              autoComplete="off"
              className="w-full h-16 px-2 py-1 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground"
              onKeyDown={handleKeyDown}
              disabled={disabled}
            />
          </Field>
        )}
      />

      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/40">
        <div className="flex items-center gap-2">
          <Toggle
            size="sm"
            variant="outline"
            pressed={isThinking}
            onPressedChange={setIsThinking}
            aria-label="Toggle thinking mode"
            className={cn(
              "text-xs h-8 px-2.5 gap-1.5 border-transparent hover:border-input transition-colors",
              isThinking &&
                "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            )}
          >
            <BrainIcon className="size-4" />
            <span className="hidden font-medium sm:inline">Thought</span>
          </Toggle>

          <Select
            value={mode}
            onValueChange={(val) => setMode(val as "general" | "personal")}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-27.5 capitalize bg-transparent border-transparent hover:border-input focus:ring-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          type="submit"
          size="icon"
          variant="ghost"
          disabled={disabled || !isValid}
          className="transition-all rounded-full size-8 text-primary hover:bg-primary/10 hover:text-primary disabled:bg-transparent disabled:opacity-50"
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </form>
  );
}
