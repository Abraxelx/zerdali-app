"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "./auth";
import { MessageProvider } from "./messages";
import { NotificationProvider } from "./notifications";
import { ThemeProvider } from "./theme";
import { QUERY_STALE } from "./query-config";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 15 * 60 * 1000,
            retry: (failureCount, error) => {
              const msg = error instanceof Error ? error.message : "";
              if (msg.includes("401") || msg.includes("403") || msg.includes("404")) return false;
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MessageProvider>
          <AuthProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </AuthProvider>
        </MessageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
