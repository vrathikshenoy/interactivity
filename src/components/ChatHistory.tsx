import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

interface ChatHistoryProps {
  currentChatId: string;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export function ChatHistory({
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
}: ChatHistoryProps) {
  const [chatSessions, setChatSessions] = useState<
    { id: string; title: string }[]
  >([]);

  useEffect(() => {
    const savedChats = localStorage.getItem("chatSessions");
    if (savedChats) {
      setChatSessions(JSON.parse(savedChats));
    }
  }, [currentChatId]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteChat(id);
    const updated = chatSessions.filter((chat) => chat.id !== id);
    setChatSessions(updated);
    localStorage.setItem("chatSessions", JSON.stringify(updated));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button
          onClick={onNewChat}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Plus size={16} />
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chatSessions.map((chat) => (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent ${currentChatId === chat.id ? "bg-accent" : ""}`}
            >
              <div className="flex items-center gap-2 truncate">
                <MessageSquare size={16} className="flex-shrink-0" />
                <span className="truncate">{chat.title || "New Chat"}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-destructive"
                onClick={(e) => handleDelete(chat.id, e)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
