"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { logoutUser } from "@/features/auth/action";

interface IdleTimerProps {
  timeoutMinutes?: number;
}

const ACTIVE_EVENTS = [
  "mousemove",
  "keydown",
  "wheel",
  "mousedown",
  "touchstart",
  "scroll",
] as const;

const THROTTLE_DELAY_MS = 1000;

export function IdleTimer({ timeoutMinutes = 15 }: IdleTimerProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const lastActivityRef = useRef<number>(0);
  const isLoggingOutRef = useRef<boolean>(false);

  useEffect(() => {
    lastActivityRef.current = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;

    const handleLogout = async () => {
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;

      try {
        await logoutUser();
        queryClient.removeQueries();
        toast.info("Sesi kamu telah berakhir.");

        router.push("/");
      } catch (error) {
        console.error("Gagal melakukan auto-logout:", error);
        isLoggingOutRef.current = false;
      }
    };

    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current >= THROTTLE_DELAY_MS) {
        lastActivityRef.current = now;
      }
    };

    ACTIVE_EVENTS.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Pengecekan interval setiap 1 detik
    const intervalId = setInterval(() => {
      if (lastActivityRef.current === 0) return;

      const now = Date.now();
      const idleTimeMs = now - lastActivityRef.current;
      // const remainingSeconds = Math.max(
      //   0,
      //   Math.ceil((timeoutMs - idleTimeMs) / 1000),
      // );

      // if (process.env.NODE_ENV === "development") {
      //   console.log(
      //     `[IdleTimer] Timeout in: ${timeoutMinutes}m | Sisa waktu: ${remainingSeconds}s`,
      //   );
      // }

      if (idleTimeMs >= timeoutMs) {
        handleLogout();
      }
    }, 1000);

    return () => {
      clearInterval(intervalId);
      ACTIVE_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [queryClient, router, timeoutMinutes]);

  return null;
}
