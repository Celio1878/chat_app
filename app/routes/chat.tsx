import {type FormEvent, useEffect, useRef, useState} from "react";
import type {Route} from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chat AI" },
    { name: "description", content: "CHAT AI APP" },
  ];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const charQueue = useRef<string[]>([]);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function startTyping() {
    if (typingTimer.current !== null) return;

    typingTimer.current = window.setInterval(() => {
      if (charQueue.current.length === 0) {
        clearInterval(typingTimer.current!);
        typingTimer.current = null;
        setIsStreaming(false); // Stop streaming state when typing finishes
        return;
      }

      const nextChar = charQueue.current.shift()!;

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === "ai") {
          return [
            ...prev.slice(0, -1),
            { ...last, content: last.content + nextChar },
          ];
        } else {
          // If the AI bubble hasn't appeared yet, put the character back
          // and wait for the next interval
          charQueue.current.unshift(nextChar);
          return prev;
        }
      });
    }, 15); // typing speed
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsStreaming(true);

    // Initial empty AI bubble will be added after we confirm we have a response
    // or when the stream starts
    try {
      const response = await fetch("http://localhost:8080/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, thread_id: "user-123" }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("Content-Type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        const reply = data.reply || data.message || data.content;
        if (reply) {
          // Create empty AI bubble only if we have something to show
          setMessages((prev) => [...prev, { role: "ai", content: "" }]);
          for (const ch of reply) {
            charQueue.current.push(ch);
          }
          startTyping();
        } else {
          setIsStreaming(false);
        }
        return;
      }

      if (!response.body) {
        setIsStreaming(false);
        return;
      }

      // Create empty AI bubble for streaming
      setMessages((prev) => [...prev, { role: "ai", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const jsonStr = trimmed.slice(6); // remove "data: "
            const data = JSON.parse(jsonStr);

            if (data.chunk) {
              const content = typeof data.chunk === 'string' ? data.chunk : data.chunk.join('');
              for (const ch of content) {
                charQueue.current.push(ch);
              }
              startTyping();
            }
          } catch (err) {
            console.error("Stream parse error:", err);
          }
        }
      }

      // Handle any remaining content in buffer
      if (buffer) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const jsonStr = trimmed.slice(6);
            const data = JSON.parse(jsonStr);
            if (data.chunk) {
              const content = typeof data.chunk === 'string' ? data.chunk : data.chunk.join('');
              for (const ch of content) {
                charQueue.current.push(ch);
              }
              startTyping();
            }
          } catch (err) {
            // Ignore if it's incomplete
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setIsStreaming(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col h-screen">
      <h1 className="text-2xl font-bold mb-4">GPT-OSS Chat</h1>

      <div
        ref={scrollRef}
        className="bg-gray-100 p-4 rounded mb-4 flex-1 overflow-y-auto min-h-50"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-4 ${msg.role === "user" ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block p-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-black text-white"
                  : "bg-white text-emerald-600 border border-gray-200"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {isStreaming && (
          <p className="text-gray-500 animate-pulse italic text-sm">
            GPT-OSS is typing…
          </p>
        )}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border p-2 grow rounded focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="Type a message..."
          disabled={isStreaming}
          autoFocus
        />
        <button
          type="submit"
          disabled={isStreaming}
          className="bg-black text-white px-6 py-2 rounded disabled:bg-gray-400 transition-colors"
        >
          {isStreaming ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
