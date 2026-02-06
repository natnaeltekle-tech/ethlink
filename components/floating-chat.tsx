'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { getChatResponse } from '@/lib/actions/chat';
import { processUserMessage } from '@/lib/actions/ai-search';
import ReactMarkdown from 'react-markdown';
import { ChatBookingForm } from './chat-booking-form';
import { toast } from 'sonner';

interface Message {
    id: string;
    role: 'user' | 'ai';
    content: React.ReactNode;
}

export function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [bookingServiceId, setBookingServiceId] = useState<string | null>(null);
    const [showNudge, setShowNudge] = useState(false);

    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'ai',
                    content: 'Hi! I am the EthLink AI. What service are you looking for?',
                },
            ]);
        }
    }, [messages.length]);

    // Show nudge after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isOpen) {
                setShowNudge(true);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, [isOpen]);

    // Reset chat when closed
    useEffect(() => {
        if (!isOpen) {
            setMessages([
                {
                    id: 'welcome',
                    role: 'ai',
                    content: 'Hi! I am the EthLink AI. What service are you looking for?',
                },
            ]);
            setBookingServiceId(null);
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping, isOpen, bookingServiceId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            // HYBRID SEARCH: Try AI first, fallback to rule-based on error
            let responseText: string;

            try {
                // Attempt AI-powered search first
                responseText = await processUserMessage(String(userMessage.content));
            } catch (aiError) {
                // Fallback to rule-based search if AI fails
                console.log('AI search failed, falling back to rule-based search:', aiError);
                responseText = await getChatResponse(String(userMessage.content));
            }

            const aiChatMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: responseText,
            };
            setMessages((prev) => [...prev, aiChatMessage]);

        } catch (error) {
            console.error("Search failed", error);
            toast.error("Failed to connect to AI. Please try again.");
            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'ai',
                content: "Sorry, I encountered an error while searching. Please try again later.",
            };
            setMessages((prev) => [...prev, aiMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleBookingSuccess = () => {
        setBookingServiceId(null);
        const successMessage: Message = {
            id: Date.now().toString(),
            role: 'ai',
            content: "✅ Booking confirmed! You can view it in your dashboard.",
        };
        setMessages((prev) => [...prev, successMessage]);
    };

    const constraintsRef = useRef(null);

    return (
        <>
            <div ref={constraintsRef} className="fixed inset-4 pointer-events-none z-[39]" />
            <motion.div
                drag
                dragConstraints={constraintsRef}
                dragMomentum={false}
                dragElastic={0.1}
                className="fixed bottom-32 md:bottom-6 right-6 z-[60] flex flex-col items-end gap-3"
            >
                {/* Nudge Bubble */}
                {showNudge && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-none shadow-xl text-sm font-medium relative mb-1"
                    >
                        How can I help you?
                        <motion.button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowNudge(false);
                            }}
                            className="absolute -top-2 -right-2 bg-muted text-muted-foreground rounded-full p-0.5 border border-border hover:bg-muted/80 transition-colors"
                        >
                            <X className="h-3 w-3" />
                        </motion.button>
                        <div className="absolute -bottom-2 right-4 w-4 h-4 bg-primary rotate-45 -z-10" />
                    </motion.div>
                )}

                {isOpen && (
                    <div className="w-[300px] h-[450px] bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200">
                        {/* Header */}
                        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <Bot className="h-5 w-5" />
                                <span className="font-semibold">EthLink AI</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-white hover:bg-blue-700 rounded-full"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {bookingServiceId ? (
                            <ChatBookingForm
                                serviceId={bookingServiceId}
                                onCancel={() => setBookingServiceId(null)}
                                onSuccess={handleBookingSuccess}
                            />
                        ) : (
                            <>
                                {/* Messages */}
                                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-secondary/30">
                                    {messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "flex w-full",
                                                msg.role === 'user' ? "justify-end" : "justify-start"
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    "max-w-[85%] px-4 py-2.5 text-sm",
                                                    msg.role === 'user'
                                                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-none"
                                                        : "bg-muted text-foreground rounded-2xl rounded-tl-none"
                                                )}
                                            >
                                                <ReactMarkdown
                                                    components={{
                                                        a: ({ href, children, ...props }: any) => {
                                                            const isBookingLink = href?.startsWith('/book/');
                                                            if (isBookingLink) {
                                                                return (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            const id = href.split('/book/')[1];
                                                                            setBookingServiceId(id);
                                                                        }}
                                                                        className="inline-block mt-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold text-xs transition-colors cursor-pointer"
                                                                    >
                                                                        {children}
                                                                    </button>
                                                                );
                                                            }
                                                            return (
                                                                <a
                                                                    href={href}
                                                                    {...props}
                                                                    className="inline-block mt-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold text-xs transition-colors"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                >
                                                                    {children}
                                                                </a>
                                                            );
                                                        },
                                                        p: (props: any) => (
                                                            <p {...props} className="leading-relaxed" />
                                                        )
                                                    }}
                                                >
                                                    {String(msg.content)}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && (
                                        <div className="flex justify-start w-full">
                                            <div className="bg-muted text-foreground rounded-2xl rounded-tl-none px-4 py-2.5">
                                                <div className="flex gap-1">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Input */}
                                <div className="p-3 bg-card border-t border-border shrink-0">
                                    <form onSubmit={handleSend} className="flex gap-2">
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask for a service..."
                                            className="flex-1 h-9 text-sm bg-secondary border-border"
                                        />
                                        <Button type="submit" size="icon" className="h-9 w-9 bg-blue-600 hover:bg-blue-700">
                                            <Send className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <motion.div
                    animate={!isOpen ? {
                        scale: [1, 1.05, 1],
                        boxShadow: [
                            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                            "0 0 20px 2px rgba(37, 99, 235, 0.4)",
                            "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
                        ]
                    } : {}}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="rounded-full"
                >
                    <Button
                        onClick={() => {
                            setIsOpen(!isOpen);
                            setShowNudge(false);
                        }}
                        className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                    >
                        {isOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <MessageCircle className="h-6 w-6" />
                        )}
                    </Button>
                </motion.div>
            </motion.div>
        </>
    );
}
