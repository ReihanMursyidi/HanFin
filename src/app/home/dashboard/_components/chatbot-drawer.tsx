'use client';

import { useState, useRef, useEffect } from "react";

import Markdown from 'react-markdown';
import { BotMessageSquare, BotIcon, XIcon, ChevronDownIcon } from "lucide-react";
import { Typing } from '@/components/typing';
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
   Drawer,
   DrawerClose,
   DrawerTrigger,
   DrawerContent,
   DrawerHeader,
   DrawerTitle,
   DrawerDescription,
   DrawerFooter
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { handleChatStreaming } from "@/features/ai/chat";
import ChatbotTextArea from "./chatbot-textarea";
import { Conversation } from "@/app/types/ai";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatbotDrawer() {
   const chatRef = useRef<HTMLDivElement>(null);
   const [conversation, setConversation] = useState<Conversation[]>([]);
   
   const [isThinking, setIsThinking] = useState<boolean>(false);
   const [mode, setMode] = useState<'general' | 'personal'>('general');

   const { mutate: handleChatMutation, isPending } = useMutation({
      mutationFn: async ({ isThinking, chatHistory }: { isThinking: boolean; chatHistory: Conversation[] }) => {
         if (isThinking) {
            setConversation((prev) => [
               ...prev,
               { 
                  role: 'model', 
                  parts: [
                     { thought: true, text: '' },
                     { text: '' }],
               },
            ]);

            const response = await handleChatStreaming(
               chatHistory,
               isThinking,
               mode,
            );

            for await (const chunk of response) {
               setConversation((prev) => {
                  const newConversation = [...prev];
                  const lastIndex = newConversation.length - 1;

                  const parts = newConversation[lastIndex].parts;

                  newConversation[lastIndex] = {
                     ...newConversation[lastIndex],
                     parts: [
                        {
                           ...parts[0],
                           text: chunk.startsWith('[thought]')
                              ? parts[0].text + chunk.replace('[thought]', '')
                              : parts[0].text,
                        },
                        {
                           text: !chunk.startsWith('[thought]')
                              ? parts[1].text + chunk
                              : parts[1].text,
                        },
                     ],
                  };
                  return newConversation;
               });
            }
            return response;
         } else {
            setConversation((prev) => [
               ...prev,
               { role: 'model', parts: [{ text: '' }] },
            ]);

            const response = await handleChatStreaming(
               chatHistory,
               isThinking,
               mode,
            );

            for await (const chunk of response) {
               setConversation((prev) => {
                  const newConversation = [...prev];
                  const lastIndex = newConversation.length - 1;

                  newConversation[lastIndex] = {
                     ...newConversation[lastIndex],
                     parts: [
                        { text: newConversation[lastIndex].parts[0].text + chunk },
                     ],
                  };
                  
                  return newConversation;
               });
            }
            return response;
         }
      },

      onError: (error) => {
         const botMessage = {
            role: 'model',
            parts: [{ text: 'An unexpected error has occured: ' + error.message }],
         };
         setConversation((prev) => [...prev, botMessage]);
      },
   });

   function sendMessage(message: string) {
      const newMessage = { role: 'user', parts: [{ text: message }] };
      const updatedConversation = [...conversation, newMessage];
      
      setConversation(updatedConversation);

      const MAX_CHARS = 3000;
      let currentCharCount = 0;
      const historyForAI: typeof updatedConversation = [];

      for (let i = updatedConversation.length - 1; i >= 0; i--) {
         const msg = updatedConversation[i];
         const msgLength = msg.parts.reduce((acc, part) => acc + (part.text?.length || 0), 0);
         if (currentCharCount + msgLength > MAX_CHARS && historyForAI.length > 0) {
            break;
         }

         historyForAI.unshift(msg);
         currentCharCount += msgLength;
      }
      handleChatMutation({ isThinking, chatHistory: historyForAI });
   }

   useEffect(() => {
      if (chatRef.current) {
         chatRef.current?.scrollTo({
            top: chatRef.current.scrollHeight,
            behavior: 'smooth',
         });
      }
   }, [conversation]);

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
         
            <DrawerContent className="w-screen! max-w-none! md:w-110! md:max-w-none!">
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
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted">
                        <XIcon />
                     </Button>
                  </DrawerClose>
               </DrawerHeader>
               <ScrollArea
                  className={cn(
                     "min-h-0 flex-1 bg-background rounded-2xl h-full",
                     conversation.length === 0 && "overflow-hidden"
                  )}
               >
                  <div className="flex flex-col w-full h-full min-h-[50vh] px-4 py-4 rounded-2xl bg-slate-50/50 dark:bg-background">
                     {conversation.length > 0 ? (
                        <div
                           ref={chatRef}
                           className="flex flex-col min-h-full gap-6 overflow-x-hidden"
                        >
                           {conversation.map((message, index) => (
                              <div
                                 key={`conversation-${index}`}
                                 className={cn(
                                    'flex flex-col gap-1.5 w-full',
                                    message.role === 'model' ? 'items-start' : 'items-end',
                                 )}
                              >
                                 <div
                                    className={cn('flex flex-col w-full', {
                                       'bg-primary/20 text-primary px-5 py-2 rounded-3xl rounded-br-md w-fit max-w-9/10':
                                          message.role === 'user'
                                    })}
                                 >
                                    {message.role === 'model' && (
                                       <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                                          <BotIcon className="size-3.5" />
                                          AI Advisor
                                       </div>
                                    )}

                                    {message.role === 'model' ? (
                                       <div className="response-ai">
                                          {message.parts.map((part, partIndex) => (
                                             <div key={`response-ai-${index}-${partIndex}`}>
                                                {part.thought ? (
                                                   <Collapsible className="mb-2">
                                                      <CollapsibleTrigger asChild>
                                                         <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:bg-slate-100 dark:hover:bg-muted">
                                                            Tampilkan alur berpikir
                                                            <ChevronDownIcon className="ml-1 size-3" />
                                                         </Button>
                                                      </CollapsibleTrigger>
                                                      <CollapsibleContent>
                                                         <div className="pl-3 mt-2 ml-2 space-y-2 text-xs italic border-l-2 border-slate-200 dark:border-muted-foreground/30 text-muted-foreground">
                                                            <Markdown>{part.text}</Markdown>
                                                         </div>
                                                      </CollapsibleContent>
                                                   </Collapsible>
                                                ) : (
                                                   <div className="[&>p]:mb-3 [&>p:last-child]:mb-0 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>h3]:font-bold [&>h3]:text-base [&>h3]:mb-2">
                                                      <Markdown>{part.text}</Markdown>
                                                   </div>
                                                )}
                                             </div>
                                          ))}
                                       </div>
                                    ) : (
                                       message.parts[0].text
                                    )}
                                 </div>
                              </div>
                           ))}

                           {isPending && (
                              <div className="flex items-center">
                                 <Typing className="size-8 text-primary/50" />
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center flex-1 w-full h-full gap-2 my-auto text-center">
                           <BotIcon className="mb-2 size-16 text-primary" />
                           <h2 className="text-2xl font-bold text-center text-foreground">Hello There!</h2>
                           <h4 className="max-w-[80%] text-center text-sm text-muted-foreground">Ask me anything about your finances or investment strategies.</h4>
                        </div>
                     )}
                  </div>
               </ScrollArea>
               <DrawerFooter className="p-0">
                  <ChatbotTextArea
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