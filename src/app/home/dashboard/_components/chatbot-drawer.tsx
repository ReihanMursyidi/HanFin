"use client";

import { useMutation } from "@tanstack/react-query";

import {
  BotIcon,
  BotMessageSquare,
  ChevronDownIcon,
  XIcon,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import type { Conversation } from "@/app/types/ai";
import { Typing } from "@/components/typing";
import { Button } from "@/components/ui/button";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { ScrollArea } from "@/components/ui/scroll-area";
import { handleChatStreaming } from "@/features/ai/chat";
import { getFinancialProfile } from "@/features/profile/action";
import { cn } from "@/lib/utils";
import ChatbotTextArea from "./chatbot-textarea";

type FinancialProfile = Awaited<ReturnType<typeof getFinancialProfile>>;
type ChatMessage = Conversation & { id: string };

// --- SUB-KOMPONEN: THOUGHT BLOCK ---
function ThoughtBlock({ text }: { text: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted"
        >
          {isOpen ? "Sembunyikan alur berpikir" : "Tampilkan alur berpikir"}
          <ChevronDownIcon
            className={cn(
              "ml-1 size-3 transition-transform duration-200",
              isOpen && "rotate-180", // Animasi panah berputar saat dibuka
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-3 mt-2 ml-2 space-y-2 text-xs italic border-l-2 select-text border-slate-200 dark:border-muted-foreground/30 text-muted-foreground">
          <Markdown>{text}</Markdown>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// --- SUB-KOMPONEN: BUBBLE CHAT ---
function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 w-full",
        isUser ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn("flex flex-col w-full", {
          "bg-primary/20 text-primary px-5 py-2 rounded-3xl rounded-br-md w-fit max-w-[90%]":
            isUser,
        })}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ml-1 mb-1">
            <BotIcon className="size-3.5" />
            AI Advisor
          </div>
        )}

        {isUser ? (
          <div className="whitespace-pre-wrap select-text">
            {message.parts[0].text}
          </div>
        ) : (
          <div className="select-text response-ai cursor-text">
            {message.parts.map((part, index) => (
              <div key={`${message.id}-${index}`}>
                {part.thought ? (
                  <ThoughtBlock text={part.text} />
                ) : (
                  <div className="select-text prose prose-sm dark:prose-invert [&>p]:mb-3 [&>p:last-child]:mb-0">
                    <Markdown>{part.text}</Markdown>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-KOMPONEN: EMPTY STATE ---
function EmptyChatState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full h-full gap-2 my-auto text-center">
      <BotIcon className="mb-2 size-16 text-primary" />
      <h2 className="text-2xl font-bold text-center text-foreground">
        Hello There!
      </h2>
      <h4 className="max-w-[80%] text-center text-sm text-muted-foreground">
        Ask me anything about your finances or investment strategies.
      </h4>
    </div>
  );
}

// --- KOMPONEN UTAMA ---
export default function ChatbotDrawer() {
  const chatRef = useRef<HTMLDivElement>(null);

  // States
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [profile, setProfile] = useState<FinancialProfile>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [mode, setMode] = useState<"general" | "personal">("general");

  // Fetch Profile saat mount
  useEffect(() => {
    let isMounted = true;
    getFinancialProfile()
      .then((data) => {
        if (isMounted) setProfile(data);
      })
      .catch((err) => console.error("Error loading profile:", err));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({
        top: chatRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [conversation]);

  // Mutation untuk streaming respons AI
  const { mutate: handleChatMutation, isPending } = useMutation({
    mutationFn: async ({
      chatHistory,
      isThinking,
      mode,
    }: {
      isThinking: boolean;
      chatHistory: Conversation[];
      mode: "general" | "personal";
    }) => {
      setConversation((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "model",
          parts: isThinking
            ? [{ thought: true, text: "" }, { text: "" }]
            : [{ text: "" }],
        },
      ]);

      const stream = await handleChatStreaming(
        chatHistory,
        profile,
        isThinking,
        mode,
      );

      for await (const chunk of stream) {
        setConversation((prev) => {
          const updatedChat = [...prev];
          const lastIndex = updatedChat.length - 1;
          const message = updatedChat[lastIndex];

          if (message?.role !== "model") return prev;

          const partIndex = isThinking ? (chunk.type === "thought" ? 0 : 1) : 0;

          const parts = [...message.parts];
          const part = parts[partIndex] || {
            text: "",
            ...(chunk.type === "thought" && { thought: true }),
          };

          parts[partIndex] = {
            ...part,
            text: `${part?.text ?? ""}${chunk.text}`,
          };

          updatedChat[lastIndex] = { ...message, parts };
          return updatedChat;
        });
      }
    },
    onError: (error, variables) => {
      const errorText = `An unexpected error has occurred: ${error.message}`;
      setConversation((prev) => {
        const updatedChat = [...prev];
        const lastIndex = updatedChat.length - 1;
        const message = updatedChat[lastIndex];

        if (message?.role !== "model") {
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "model",
              parts: [{ text: errorText }],
            },
          ];
        }

        const answerIndex = variables.isThinking ? 1 : 0;
        const parts = [...message.parts];
        const answer = parts[answerIndex];

        parts[answerIndex] = {
          ...answer,
          text: answer?.text ? `${answer.text}\n\n${errorText}` : errorText,
        };

        updatedChat[lastIndex] = { ...message, parts };
        return updatedChat;
      });
    },
  });

  // Handler pengiriman pesan dari user
  const sendMessage = (message: string) => {
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ text: message }],
    };

    const updatedConversation = [...conversation, newMessage];
    setConversation(updatedConversation);

    // Filter riwayat maksimal 3000 karakter
    const MAX_CHARS = 3000;
    let currentCharCount = 0;
    const historyForAI: Conversation[] = [];

    for (let i = updatedConversation.length - 1; i >= 0; i--) {
      const msg = updatedConversation[i];
      const msgLength = msg.parts.reduce(
        (acc, part) => acc + (part.text?.length || 0),
        0,
      );

      if (currentCharCount + msgLength > MAX_CHARS && historyForAI.length > 0)
        break;

      historyForAI.unshift({ role: msg.role, parts: msg.parts });
      currentCharCount += msgLength;
    }

    handleChatMutation({ isThinking, chatHistory: historyForAI, mode });
  };

  return (
    <Drawer direction="right" modal={false}>
      <DrawerTrigger className="fixed bottom-4 right-4" asChild>
        <Button
          className="rounded-full shadow-lg bg-background size-14 hover:bg-primary hover:text-secondary dark:bg-slate-800 dark:hover:bg-primary"
          size="icon-lg"
          variant="outline"
        >
          <BotMessageSquare className="size-6" />
        </Button>
      </DrawerTrigger>

      <DrawerContent className="w-screen sm:w-112.5 max-w-none">
        <DrawerHeader className="flex flex-row justify-between pb-4 border-b">
          <div>
            <DrawerTitle className="font-bold text-primary">
              AI Financial Advisor
            </DrawerTitle>
            <DrawerDescription>
              Get personalized financial advice.
            </DrawerDescription>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted"
            >
              <XIcon />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <ScrollArea
          data-vaul-no-drag
          className={cn(
            "min-h-0 flex-1 bg-background h-full",
            conversation.length === 0 && "overflow-hidden",
          )}
        >
          <div className="flex flex-col w-full h-full min-h-[50vh] px-4 py-4 bg-slate-50/50 dark:bg-background">
            {conversation.length > 0 ? (
              <div
                ref={chatRef}
                className="flex flex-col min-h-full gap-6 pb-4 overflow-x-hidden"
              >
                {conversation.map((message) => (
                  <ChatMessageBubble key={message.id} message={message} />
                ))}

                {isPending && (
                  <div className="flex items-center mt-2">
                    <Typing className="size-8 text-primary/50" />
                  </div>
                )}
              </div>
            ) : (
              <EmptyChatState />
            )}
          </div>
        </ScrollArea>

        <DrawerFooter className="p-0 border-t">
          <ChatbotTextArea
            disabled={isPending}
            isThinking={isThinking}
            setIsThinking={setIsThinking}
            sendMessage={sendMessage}
            mode={mode}
            setMode={setMode}
          />
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
