import {type ActionFunctionArgs, Form, useActionData, useNavigation} from "react-router";
import type {Route} from "./+types/home";
import {sendChatMessage} from "~/utils/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Chat AI" },
    { name: "description", content: "CHAT AI APP" },
  ];
}

// This runs on the server (or client-side transition) when the Form is submitted
export async function action({request}: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message") as string;
  const threadId = "user-123"; // You can make this dynamic later

  const data = await sendChatMessage(message, threadId);
  return {reply: data.reply, userMessage: message};
}

export default function ChatPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">GPT-OSS Chat</h1>

      {/* Message Display Area */}
      <div className="bg-gray-100 p-4 rounded mb-4 min-h-50">
        {actionData?.userMessage && (
          <p className="text-blue-600"><strong>You:</strong> {actionData.userMessage}</p>
        )}
        {isSubmitting ? (
          <p className="text-gray-500 animate-pulse italic">GPT-OSS is thinking...</p>
        ) : (
          actionData?.reply && (
            <p className="mt-2 text-emerald-500"><strong>AI:</strong> {actionData.reply}</p>
          )
        )}
      </div>

      {/* Form using React Router Action */}
      <Form method="post" className="flex gap-2">
        <input
          name="message"
          className="border p-2 grow rounded"
          placeholder="Type a message..."
          required
          autoFocus
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </Form>
    </div>
  );
}