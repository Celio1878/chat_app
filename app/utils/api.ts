export async function sendChatMessage(message: string, threadId: string) {
  const response = await fetch("http://localhost:8080/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, thread_id: threadId }),
  });
  if (!response.ok) throw new Error("Failed to reach chat server");
  return response.json();
}