"use client";

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";

export type MessageType = "success" | "error" | "info";

export type Message = {
  id: string;
  type: MessageType;
  title: string;
  text?: string;
};

type MessageContextType = {
  show: (type: MessageType, title: string, text?: string) => void;
  success: (title: string, text?: string) => void;
  error: (title: string, text?: string) => void;
  info: (title: string, text?: string) => void;
};

const MessageContext = createContext<MessageContextType | null>(null);

const styles: Record<MessageType, { cls: string; Icon: typeof CheckCircle2 }> = {
  success: { cls: "border-green-300/50 bg-green-50/90 dark:bg-green-950/40 dark:border-green-800/40", Icon: CheckCircle2 },
  error: { cls: "border-red-300/50 bg-red-50/90 dark:bg-red-950/40 dark:border-red-800/40", Icon: AlertCircle },
  info: { cls: "border-blue-300/50 bg-blue-50/90 dark:bg-blue-950/40 dark:border-blue-800/40", Icon: Info },
};

const iconColors: Record<MessageType, string> = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  info: "text-blue-600 dark:text-blue-400",
};

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const show = useCallback((type: MessageType, title: string, text?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [...prev, { id, type, title, text }].slice(-4));
    setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);

  const success = useCallback((title: string, text?: string) => show("success", title, text), [show]);
  const error = useCallback((title: string, text?: string) => show("error", title, text), [show]);
  const info = useCallback((title: string, text?: string) => show("info", title, text), [show]);

  return (
    <MessageContext.Provider value={{ show, success, error, info }}>
      {children}
      {messages.length > 0 && (
        <div className="fixed top-20 left-1/2 z-[110] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
          {messages.map((m) => {
            const s = styles[m.type];
            return (
              <div
                key={m.id}
                className={`glass-strong animate-fade-in-up flex items-start gap-3 rounded-xl border p-3 shadow-lg ${s.cls}`}
              >
                <s.Icon size={18} className={`mt-0.5 shrink-0 ${iconColors[m.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{m.title}</p>
                  {m.text && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{m.text}</p>}
                </div>
                <button onClick={() => dismiss(m.id)} className="text-zinc-400 hover:text-zinc-600" aria-label="Kapat">
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </MessageContext.Provider>
  );
}

export function useMessage() {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMessage must be used within MessageProvider");
  return ctx;
}

/** API hatasını merkezi toast'a çevirir. */
export function showApiError(msg: { error: (t: string, x?: string) => void }, err: unknown, fallback = "İşlem başarısız") {
  if (err instanceof ApiError) {
    msg.error(err.detail || fallback);
    return;
  }
  msg.error(fallback, err instanceof Error ? err.message : undefined);
}

export class ApiError extends Error {
  title: string;
  detail: string;
  status: number;

  constructor(status: number, message: string) {
    const detail =
      message && !message.startsWith("Request failed") ? message : friendlyApiMessage(status, message);
    super(detail);
    this.status = status;
    this.detail = detail;
    this.title = detail;
  }
}

export function friendlyApiMessage(status: number, raw: string): string {
  if (raw && !raw.startsWith("Request failed")) return raw;
  const defaults: Record<number, string> = {
    401: "Lütfen tekrar giriş yap.",
    403: "Bu işlem için yetkiniz yok.",
    404: "İstenen kayıt bulunamadı.",
    409: "Bu işlem tekrarlanamaz.",
    413: "Dosya en fazla 25 MB olabilir.",
    415: "Dosya gönderimi algılanamadı. Lütfen dosyayı tekrar seçip dene.",
    422: "Teslim metni veya dosyadan en az biri gerekli.",
    429: "Kısa süre sonra tekrar deneyin.",
    500: "Sunucuda bir sorun oluştu.",
  };
  return defaults[status] ?? `Beklenmeyen hata (${status})`;
}
