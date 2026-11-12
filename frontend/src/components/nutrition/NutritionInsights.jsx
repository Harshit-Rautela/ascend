/**
 * ASCEND — NUTRITION AI CHAT
 *
 * Conversational nutrition assistant powered by Gemini.
 * Retrieves personal nutrition insights through the backend.
 */

import { useEffect, useRef, useState } from "react";

import {
    Activity,
    Bot,
    Sparkles,
    Send,
    Trash2,
    User,
    LoaderCircle,
    Utensils,
    Flame,
    Beef,
    ChartNoAxesCombined,
    ShieldCheck,
    Copy,
    Check,
    RefreshCw,
} from "lucide-react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import "./nutrition.css";
import API_BASE_URL from "../../config/api";


const API_URL = `${API_BASE_URL}/nutrition/insights`;

const suggestions = [
    {
        icon: Flame,
        label: "Analyze my nutrition",
        message:
            "Analyze my nutrition over the last 30 days. What patterns do you notice?",
    },
    {
        icon: Beef,
        label: "Review my protein intake",
        message: "Analyze my protein intake over the last 30 days.",
    },
    {
        icon: ChartNoAxesCombined,
        label: "Macro breakdown",
        message:
            "Give me a detailed breakdown of my calories, protein, carbs, and fat.",
    },
    {
        icon: Utensils,
        label: "Analyze my meals",
        message:
            "Analyze my meal patterns. Which meals contribute the most to my daily nutrition?",
    },
];

function getTime() {
    return new Intl.DateTimeFormat("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
    }).format(new Date());
}

function createGreeting(content) {
    return {
        id: Date.now(),
        role: "assistant",
        content,
        time: getTime(),
        sources: [],
    };
}

export default function NutritionInsights() {
    const [messages, setMessages] = useState([
        createGreeting(
            "Hey! I'm your **Ascend Nutrition Assistant**. I can help you understand your eating patterns, analyze your macros, explore micronutrients, and identify trends in your nutrition records.\n\nWhat would you like to explore?"
        ),
    ]);

    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [copiedMessageId, setCopiedMessageId] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, loading]);

    // ------------------------------------------
    // API request
    // ------------------------------------------

    async function fetchAssistantResponse(question) {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: question,
            }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Unable to process your question."
            );
        }

        const aiResult = result.data;

        if (!aiResult || typeof aiResult.answer !== "string") {
            throw new Error("The assistant returned an invalid response.");
        }

        return {
            id: Date.now(),
            role: "assistant",
            content: aiResult.answer,
            time: getTime(),
            sources: aiResult.sources || [],
            incomplete: Boolean(aiResult.incomplete),
        };
    }

    // ------------------------------------------
    // Send a new message
    // ------------------------------------------

    async function sendMessage(message = input) {
        const trimmedMessage = message.trim();

        if (!trimmedMessage || loading) return;

        if (trimmedMessage.length > 1000) {
            setError("Your message cannot exceed 1000 characters.");
            return;
        }

        const userMessage = {
            id: Date.now(),
            role: "user",
            content: trimmedMessage,
            time: getTime(),
        };

        setMessages((previous) => [...previous, userMessage]);
        setInput("");
        setError("");
        setLoading(true);

        try {
            const assistantMessage =
                await fetchAssistantResponse(trimmedMessage);

            setMessages((previous) => [
                ...previous,
                assistantMessage,
            ]);
        } catch (err) {
            setError(
                err.message || "Something went wrong. Please try again."
            );
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }

    // ------------------------------------------
    // Copy a message
    // ------------------------------------------

    async function copyMessage(message) {
        try {
            await navigator.clipboard.writeText(message.content);

            setCopiedMessageId(message.id);

            // Clear the copied indicator after a short delay.
            window.setTimeout(() => {
                setCopiedMessageId((current) =>
                    current === message.id ? null : current
                );
            }, 1800);
        } catch {
            setError(
                "Unable to copy this message. Check your browser clipboard permissions."
            );
        }
    }

    // ------------------------------------------
    // Regenerate the latest assistant response
    // ------------------------------------------

    async function regenerateResponse() {
        if (loading) return;

        const lastMessage = messages[messages.length - 1];
        const previousMessage = messages[messages.length - 2];

        // Regeneration is only available when the latest message
        // is an assistant response immediately following a user prompt.
        if (
            !lastMessage ||
            lastMessage.role !== "assistant" ||
            !previousMessage ||
            previousMessage.role !== "user"
        ) {
            return;
        }

        const originalQuestion = previousMessage.content;

        // Remove the old assistant response, keeping the user prompt.
        setMessages((previous) => previous.slice(0, -1));

        setError("");
        setLoading(true);

        try {
            const assistantMessage =
                await fetchAssistantResponse(originalQuestion);

            setMessages((previous) => [
                ...previous,
                assistantMessage,
            ]);
        } catch (err) {
            setError(
                err.message || "Unable to regenerate the response."
            );
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    }

    // ------------------------------------------
    // Form and chat actions
    // ------------------------------------------

    function handleSubmit(event) {
        event.preventDefault();
        sendMessage();
    }

    function clearChat() {
        if (loading) return;

        setMessages([
            createGreeting(
                "Chat cleared! What would you like to understand about your nutrition?"
            ),
        ]);

        setError("");
        setCopiedMessageId(null);
    }

    const hasUserMessages = messages.some(
        (message) => message.role === "user"
    );

    const lastMessage = messages[messages.length - 1];

    const canRegenerate =
        lastMessage?.role === "assistant" &&
        messages.length >= 2 &&
        messages[messages.length - 2]?.role === "user";

    // ------------------------------------------
    // UI
    // ------------------------------------------

    return (
        <main className="nutrition-ai-page">
            {/* Header */}

            <header className="nutrition-ai-header">
                <div className="nutrition-ai-heading">
                    <div className="nutrition-ai-icon">
                        <Sparkles size={23} />
                    </div>

                    <div>
                        <p className="nutrition-ai-eyebrow">
                            ASCEND INTELLIGENCE
                        </p>

                        <h1>Nutrition AI</h1>

                        <p>
                            Understand your nutrition. Make informed
                            decisions.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="nutrition-ai-clear-button"
                    onClick={clearChat}
                    disabled={loading || !hasUserMessages}
                >
                    <Trash2 size={15} />
                    Clear chat
                </button>
            </header>

            {/* Chat container */}

            <section className="nutrition-ai-chat-container">
                {/* Status bar */}

                <div className="nutrition-ai-status">
                    <span className="nutrition-ai-status-indicator" />

                    <span>Nutrition Assistant online</span>

                    <span className="nutrition-ai-status-divider">
                        ·
                    </span>

                    <span>Powered by Gemini</span>
                </div>

                {/* Messages */}

                <div
                    className="nutrition-ai-messages"
                    aria-live="polite"
                    aria-label="Nutrition AI conversation"
                >
                    {messages.map((message) => {
                        const isAssistant =
                            message.role === "assistant";

                        const isCopied =
                            copiedMessageId === message.id;

                        const isLatestAssistant =
                            isAssistant &&
                            message.id === lastMessage?.id &&
                            canRegenerate;

                        return (
                            <article
                                key={message.id}
                                className={`nutrition-ai-message ${
                                    isAssistant
                                        ? "assistant-message"
                                        : "user-message"
                                }`}
                            >
                                <div className="nutrition-ai-message-avatar">
                                    {isAssistant ? (
                                        <Bot size={18} />
                                    ) : (
                                        <User size={18} />
                                    )}
                                </div>

                                <div className="nutrition-ai-message-content">
                                    <div className="nutrition-ai-message-meta">
                                        <span className="nutrition-ai-message-author">
                                            {isAssistant
                                                ? "Nutrition AI"
                                                : "You"}
                                        </span>

                                        <span className="nutrition-ai-message-time">
                                            {message.time}
                                        </span>
                                    </div>

                                    <div className="nutrition-ai-message-bubble">
                                        {isAssistant ? (
                                            <div className="nutrition-ai-markdown">
                                                <ReactMarkdown
                                                    remarkPlugins={[
                                                        remarkGfm,
                                                    ]}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p>{message.content}</p>
                                        )}

                                        {message.incomplete && (
                                            <p className="nutrition-ai-incomplete">
                                                <Activity size={13} />
                                                Incomplete analysis
                                            </p>
                                        )}
                                    </div>

                                    {/* Message actions */}

                                    <div className="nutrition-ai-message-actions">
                                        <button
                                            type="button"
                                            className="nutrition-ai-action-button"
                                            onClick={() =>
                                                copyMessage(message)
                                            }
                                            aria-label={
                                                isCopied
                                                    ? "Message copied"
                                                    : `Copy ${
                                                          isAssistant
                                                              ? "answer"
                                                              : "question"
                                                      }`
                                            }
                                            title={
                                                isAssistant
                                                    ? "Copy answer"
                                                    : "Copy question"
                                            }
                                        >
                                            {isCopied ? (
                                                <Check size={13} />
                                            ) : (
                                                <Copy size={13} />
                                            )}

                                            <span>
                                                {isCopied
                                                    ? "Copied"
                                                    : "Copy"}
                                            </span>
                                        </button>

                                        {isLatestAssistant && (
                                            <button
                                                type="button"
                                                className="nutrition-ai-action-button"
                                                onClick={regenerateResponse}
                                                disabled={loading}
                                                title="Regenerate answer"
                                            >
                                                <RefreshCw size={13} />
                                                <span>Regenerate</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Data sources */}

                                    {isAssistant &&
                                        message.sources?.length > 0 && (
                                            <div className="nutrition-ai-sources">
                                                <ShieldCheck size={13} />

                                                <span>
                                                    Data retrieved from:
                                                </span>

                                                {message.sources.map(
                                                    (source) => (
                                                        <span
                                                            className="nutrition-ai-source"
                                                            key={source}
                                                        >
                                                            {source
                                                                .replaceAll(
                                                                    "_",
                                                                    " "
                                                                )
                                                                .replace(
                                                                    /\b\w/g,
                                                                    (c) =>
                                                                        c.toUpperCase()
                                                                )}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )}
                                </div>
                            </article>
                        );
                    })}

                    {/* Typing indicator */}

                    {loading && (
                        <div className="nutrition-ai-message assistant-message">
                            <div className="nutrition-ai-message-avatar">
                                <Bot size={18} />
                            </div>

                            <div className="nutrition-ai-message-content">
                                <span className="nutrition-ai-message-author">
                                    Nutrition AI
                                </span>

                                <div className="nutrition-ai-typing">
                                    <span />
                                    <span />
                                    <span />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}

                {!hasUserMessages && (
                    <div className="nutrition-ai-suggestions">
                        <p className="nutrition-ai-suggestions-label">
                            EXPLORE YOUR NUTRITION
                        </p>

                        <div className="nutrition-ai-suggestion-grid">
                            {suggestions.map((suggestion) => {
                                const Icon = suggestion.icon;

                                return (
                                    <button
                                        key={suggestion.label}
                                        type="button"
                                        className="nutrition-ai-suggestion"
                                        onClick={() =>
                                            sendMessage(
                                                suggestion.message
                                            )
                                        }
                                        disabled={loading}
                                    >
                                        <Icon size={16} />
                                        <span>{suggestion.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Input area */}

                <div className="nutrition-ai-input-area">
                    {error && (
                        <p
                            className="nutrition-ai-error"
                            role="alert"
                        >
                            {error}
                        </p>
                    )}

                    <form
                        className="nutrition-ai-input-wrapper"
                        onSubmit={handleSubmit}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(event) => {
                                setInput(event.target.value);

                                if (error) setError("");
                            }}
                            placeholder="Ask anything about your nutrition..."
                            maxLength={1000}
                            disabled={loading}
                            aria-label="Ask Nutrition AI"
                        />

                        <button
                            type="submit"
                            className="nutrition-ai-send-button"
                            disabled={!input.trim() || loading}
                            aria-label="Send message"
                        >
                            {loading ? (
                                <LoaderCircle
                                    size={19}
                                    className="nutrition-ai-spinner"
                                />
                            ) : (
                                <Send size={18} />
                            )}
                        </button>
                    </form>

                    <div className="nutrition-ai-input-footer">
                        <span>
                            <ShieldCheck size={12} />
                            Responses grounded in your recorded nutrition
                            data
                        </span>

                        <span>{input.length}/1000</span>
                    </div>
                </div>
            </section>

            <p className="nutrition-ai-disclaimer">
                Nutrition AI provides informational insights, not
                medical advice.
            </p>
        </main>
    );
}