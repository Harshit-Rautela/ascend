
import { useEffect, useRef, useState } from "react";
import {
    Sparkles,
    Send,
    Moon,
    Brain,
    TrendingUp,
    Clock,
    Activity,
    LoaderCircle,
    AlertCircle,
    RotateCcw,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import API_BASE_URL from "../../config/api";


const API_URL = `${API_BASE_URL}/sleep/insights/chat`;

const SUGGESTED_QUESTIONS = [
    {
        label: "Analyze my sleep",
        question: "Analyze my recent sleep patterns and tell me what stands out.",
        icon: Brain,
    },
    {
        label: "Sleep consistency",
        question: "How consistent is my bedtime?",
        icon: Clock,
    },
    {
        label: "Sleep quality",
        question: "What patterns can you identify in my sleep quality?",
        icon: TrendingUp,
    },
    {
        label: "Recovery metrics",
        question: "Analyze my heart rate and HRV during sleep.",
        icon: Activity,
    },
];

function createMessage(role, content, sources = []) {
    return {
        id: `${Date.now()}-${Math.random()}`,
        role,
        content,
        sources: sources || [],
        timestamp: new Date(),
    };
}

function formatMessageTime(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function SleepInsights() {
    const [messages, setMessages] = useState([
        createMessage(
            "assistant",
            "Hey! I'm your Sleep AI assistant. 🌙\n\nI can help you understand your sleep patterns, analyze your recovery metrics, compare different periods, and identify areas worth improving.\n\nWhat would you like to know about your sleep?"
        ),
    ]);

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
        });
    }, [messages, isLoading]);

    async function handleSendMessage(messageText = input) {
        const trimmedMessage = messageText.trim();

        if (!trimmedMessage || isLoading) return;

        setError("");

        // Add the user's message immediately.
        setMessages((current) => [
            ...current,
            createMessage("user", trimmedMessage),
        ]);

        setInput("");
        setIsLoading(true);
        const requestStartedAt = performance.now();

        console.groupCollapsed("[Sleep AI] New message");
        console.log("Request started");
        console.log("Message length:", trimmedMessage.length);
        console.groupEnd();

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: trimmedMessage,
                }),
            });

            const result = await response.json();
            console.groupCollapsed("[Sleep AI] API response");
            console.log("HTTP status:", response.status);
            console.log("Success:", result.success);
            console.log("Sources:", result.data?.sources);
            console.log(
                "Duration:",
                `${Math.round(performance.now() - requestStartedAt)} ms`
            );
            console.groupEnd();
            if (!response.ok || !result.success) {
                throw new Error(
                    result.error || "Unable to generate sleep insights."
                );
            }

            const answer = result.data?.answer;

            if (typeof answer !== "string" || !answer.trim()) {
                throw new Error("The AI returned an empty response.");
            }

            // Display Gemini's response.
            setMessages((current) => [
                ...current,
                createMessage(
                    "assistant",
                    answer,
                    result.data?.sources || []
                ),
            ]);
        } catch (err) {
            console.error("Sleep AI error:", err);
            // console.error("[Sleep AI] Request failed:", err);

            setError(
                err.message || "Something went wrong. Please try again."
            );
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        handleSendMessage();
    }

    function handleClearChat() {
        if (isLoading) return;

        setMessages([
            createMessage(
                "assistant",
                "Chat cleared! 🌙 What would you like to explore about your sleep?"
            ),
        ]);

        setInput("");
        setError("");
    }

    return (
        <section className="sleep-ai-page">
            {/* Header */}
            <div className="sleep-ai-header">
                <div className="sleep-ai-heading">
                    <div className="sleep-ai-icon">
                        <Sparkles size={22} />
                    </div>

                    <div>
                        <span className="sleep-section-label">
                            YOUR PERSONAL SLEEP ANALYST
                        </span>

                        <h2>Sleep AI Assistant</h2>

                        <p>
                            Understand your sleep. Discover patterns. Improve your recovery.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="sleep-ai-clear-button"
                    onClick={handleClearChat}
                    disabled={isLoading}
                >
                    <RotateCcw size={15} />
                    <span>Clear chat</span>
                </button>
            </div>

            {/* Chat panel */}
            <div className="sleep-ai-chat-container">
                <div className="sleep-ai-status">
                    <div className="sleep-ai-status-indicator" />
                    <span>AI assistant</span>
                    <span className="sleep-ai-status-divider">·</span>
                    <span>Sleep data analysis</span>
                </div>

                {/* Messages */}
                <div className="sleep-ai-messages">
                    {messages.map((message) => {
                        const isAssistant = message.role === "assistant";

                        return (
                            <div
                                key={message.id}
                                className={`sleep-ai-message ${isAssistant ? "assistant-message" : "user-message"
                                    }`}
                            >
                                {isAssistant && (
                                    <div className="sleep-ai-message-avatar">
                                        <Sparkles size={16} />
                                    </div>
                                )}

                                <div className="sleep-ai-message-content">
                                    <div className="sleep-ai-message-author">
                                        {isAssistant ? "Ascend AI" : "You"}
                                    </div>

                                    <div className="sleep-ai-message-bubble">
                                        {message.role === "assistant" ? (
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {message.content}
                                            </ReactMarkdown>
                                        ) : (
                                            message.content
                                        )}
                                    </div>

                                    {isAssistant && (message.sources?.length ?? 0) > 0 && (
                                        <div className="sleep-ai-source">
                                            <Activity size={12} />
                                            <span>
                                                Data retrieved using {message.sources.length} tool
                                                {message.sources.length > 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    )}

                                    <span className="sleep-ai-message-time">
                                        {formatMessageTime(message.timestamp)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}

                    {/* Gemini loading state */}
                    {isLoading && (
                        <div className="sleep-ai-message assistant-message">
                            <div className="sleep-ai-message-avatar">
                                <Sparkles size={16} />
                            </div>

                            <div className="sleep-ai-message-content">
                                <div className="sleep-ai-message-author">
                                    Ascend AI
                                </div>

                                <div className="sleep-ai-typing">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error */}
                {error && (
                    <div className="sleep-ai-error">
                        <AlertCircle size={17} />
                        <span>{error}</span>
                    </div>
                )}

                {/* Suggestions */}
                {messages.length === 1 && (
                    <div className="sleep-ai-suggestions">
                        <span className="sleep-ai-suggestions-label">
                            EXPLORE YOUR SLEEP
                        </span>

                        <div className="sleep-ai-suggestions-grid">
                            {SUGGESTED_QUESTIONS.map((suggestion) => {
                                const Icon = suggestion.icon;

                                return (
                                    <button
                                        type="button"
                                        key={suggestion.label}
                                        className="sleep-ai-suggestion"
                                        disabled={isLoading}
                                        onClick={() =>
                                            handleSendMessage(suggestion.question)
                                        }
                                    >
                                        <Icon size={17} />
                                        <span>{suggestion.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Input */}
                <form
                    className="sleep-ai-input-area"
                    onSubmit={handleSubmit}
                >
                    <div className="sleep-ai-input-wrapper">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(event) => setInput(event.target.value)}
                            placeholder="Ask anything about your sleep..."
                            maxLength={1000}
                            disabled={isLoading}
                        />

                        <button
                            type="submit"
                            className="sleep-ai-send-button"
                            disabled={!input.trim() || isLoading}
                            aria-label="Send message"
                        >
                            {isLoading ? (
                                <LoaderCircle
                                    size={19}
                                    className="sleep-ai-spinner"
                                />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </div>

                    <div className="sleep-ai-input-footer">
                        <span>
                            <Moon size={13} />
                            Your sleep data powers these insights.
                        </span>

                        <span>{input.length}/1000</span>
                    </div>
                </form>
            </div>

            {/* Disclaimer */}
            <div className="sleep-ai-disclaimer">
                <Sparkles size={15} />

                <p>
                    AI-generated insights are for general wellness and informational
                    purposes only. They are not medical advice or a diagnosis.
                </p>
            </div>
        </section>
    );
}

export default SleepInsights;
