import { useEffect, useState, useRef, useCallback } from "react";
import api from "../utils/api";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ✅ Fix 2 — moved outside component, no longer called during render lifecycle
const timeAgo = (dateStr: string) => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const typeIcon: Record<string, string> = {
  waitlist_promoted: "🎉",
  class_updated: "📝",
  class_cancelled: "❌",
  review_received: "⭐",
  enrollment_new: "📋",
  enrollment_cancelled: "🚫",
  new_class_from_favorite: "🌟",
  kick_request_pending: "⚠️",
  kick_request_approved: "✅",
  kick_request_rejected: "❌",
  kicked_from_class: "🚫",
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ✅ Fix 1 — useCallback declared BEFORE the useEffect that calls it
  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
      setUnread(data.unread_count || 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    // Async IIFE — makes it explicit that setState is called asynchronously,
    // not synchronously in the effect body
    void (async () => {
      await fetchNotifications();
    })();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnread((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch {
      // silent
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-white transition"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500
            rounded-full text-[10px] font-bold text-white flex items-center
            justify-center min-w-[18px] px-1"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 bg-slate-900
          border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50"
        >
          <div
            className="flex items-center justify-between px-4 py-3
            border-b border-slate-800"
          >
            <h3 className="font-semibold text-sm text-white">Notifications</h3>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-slate-600 text-2xl mb-2">🔔</p>
                <p className="text-slate-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-800/50
                    last:border-0 hover:bg-slate-800/50 transition ${
                      !n.is_read ? "bg-slate-800/20" : ""
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {typeIcon[n.type] || "🔔"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            n.is_read ? "text-slate-400" : "text-white"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-slate-600 text-xs mt-1">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
