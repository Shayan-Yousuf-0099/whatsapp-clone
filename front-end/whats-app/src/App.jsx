import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";


const colors = [
  "bg-emerald-100 text-emerald-700",
  "bg-blue-100 text-blue-700",
  "bg-orange-100 text-orange-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
];

const profilePictures = {
  shayan: "/profiles/shayan.jpg",
  saif: "/profiles/saif.jpg",
  abdullah: "/profiles/abdullah.jpg",
  hammad: "/profiles/hammad.jpg",
  sarfaraz: "/profiles/sarfaraz.jpg",
  haris: "/profiles/haris.jpg",
  baheej: "/profiles/baheej.jpg",
  ali: "/profiles/ali.jpg",
  dua: "/profiles/dua.jpg",
};



function formatTime(date) {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function App() {
  function getProfilePicture(name) {
    const normalized = (name || "").trim().toLowerCase();

   
    if (profilePictures[normalized]) {
      return profilePictures[normalized];
    }

    const pictures = Object.entries(profilePictures)
      .filter(([username]) => username !== "shayan" && username !== "saif")
      .map(([, picture]) => picture);

   
    const hash = [...`${currentUser}-${normalized}`].reduce(
      (total, char) => total + char.charCodeAt(0),
      0,
    );

    return pictures[hash % pictures.length];
  }
  const [currentUser, setCurrentUser] = useState("shayan");
  const currentUserRef = useRef(currentUser);
useEffect(() => {
  if (socketRef.current?.connected) {
    socketRef.current.emit("registerUser", currentUser);
  }
}, [currentUser]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("abdullah");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const selectedIdRef = useRef(selectedId);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  useEffect(() => {
    console.log("TYPING USER STATE CHANGED:", typingUser);
  }, [typingUser]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);


  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newContact, setNewContact] = useState("");
  const [manualContact, setManualContact] = useState(null);



  async function loadChats() {
    const res = await fetch("/chats");

    if (!res.ok) {
      throw new Error("Chats load nahi ho sakin.");
    }

    const data = await res.json();
    setMessages(data);
  }

  useEffect(() => {
    const socket = io("http://localhost:8080");
    socketRef.current = socket;

    async function refreshChats() {
      try {
        await loadChats();
        setError("");
      } catch (err) {
        setError(err.message);
      }
    }

    refreshChats().finally(() => setLoading(false));

    socket.on("newMessage", refreshChats);
    socket.on("messageUpdated", refreshChats);
    socket.on("messageDeleted", refreshChats);
    socket.on("messagesSeen", refreshChats);


   socket.on("userTyping", ({ from, to }) => {
     console.log("Typing event received on frontend:", { from, to });
    console.log("Current user:", currentUserRef.current);
     console.log("Selected chat:", selectedIdRef.current);
     console.log("USER TYPING EVENT:", { from, to });
     console.log("TO:", JSON.stringify(to));
     console.log("CURRENT USER:", JSON.stringify(currentUser));
     console.log(
       "MATCH CHECK:",
       to?.toLowerCase() === currentUserRef.current.toLowerCase(),
       from?.toLowerCase() === selectedIdRef.current?.toLowerCase(),
     );

     if (
      to?.toLowerCase() === currentUserRef.current.toLowerCase() &&
       from?.toLowerCase() === selectedIdRef.current?.toLowerCase()
     ) {
      console.log("SETTING TYPING USER:", from);
       setTypingUser(from);
     }
   });

    
socket.on("userStoppedTyping", ({ from, to }) => {
  console.log("STOP TYPING EVENT:", {
    from,
    to,
    currentUser: currentUserRef.current,
    selectedChat: selectedIdRef.current,
  });
  const selectedChatIsOnline = selectedChat
    ? onlineUsers.includes(selectedChat.name.trim().toLowerCase())
    : false;

  if (
    to?.toLowerCase() === currentUserRef.current.toLowerCase() &&
    from?.toLowerCase() === selectedIdRef.current?.toLowerCase()
  ) {
    console.log("CLEARING TYPING USER:", from);
    setTypingUser("");
  }
});


    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("registerUser", currentUserRef.current);
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("connect_error", (err) => {
      console.error("Socket connection error:", err.message);
    });

    return () => {
      socket.off("newMessage", refreshChats);
      socket.off("messageUpdated", refreshChats);
      socket.off("messageDeleted", refreshChats);
      socket.off("userTyping");
      socket.off("userStoppedTyping");
      socket.off("messagesSeen", refreshChats);

      clearTimeout(typingTimeoutRef.current);
      socketRef.current = null;
      socket.disconnect();
    };
  }, []);

  
  const grouped = {};

  messages.forEach((chat) => {
    const from = (chat.from || "").trim();
    const to = (chat.to || "").trim();

    if (!from || !to) return;

    let contact;

    if (from.toLowerCase() === currentUser.toLowerCase()) {
      contact = to;
    } else if (to.toLowerCase() === currentUser.toLowerCase()) {
      contact = from;
    } else {
      return;
    }

    const key = contact.toLowerCase();

    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        name: contact,
        messages: [],
        color: colors[Object.keys(grouped).length % colors.length],
      };
    }

    grouped[key].messages.push(chat);
  });

  const chats = Object.values(grouped)
    .map((chat) => {
      const sortedMessages = [...chat.messages].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0),
      );

      const last = sortedMessages[sortedMessages.length - 1];

      return {
        ...chat,
        messages: sortedMessages,
        message: last?.msg || "",
        time: formatTime(last?.created_at),
      };
    })
    .sort((a, b) => {
      const aTime = new Date(
        a.messages[a.messages.length - 1]?.created_at || 0,
      );
      const bTime = new Date(
        b.messages[b.messages.length - 1]?.created_at || 0,
      );

      return bTime - aTime;
    });

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedChat =
    chats.find((chat) => chat.id === selectedId) ||
    (manualContact?.id === selectedId ? manualContact : null) ||
    chats[0] ||
    null;
    
useEffect(() => {
  if (!selectedChat || !socketRef.current?.connected) return;

  socketRef.current.emit("markSeen", {
    from: currentUser,
    to: selectedChat.name,
  });
}, [currentUser, selectedId, selectedChat?.name]);


    const selectedChatIsOnline = selectedChat
      ? onlineUsers.includes(selectedChat.name.trim().toLowerCase())
      : false;
  function startNewChat(event) {
    event.preventDefault();

    const name = newContact.trim();

    if (!name) return;

    const existingChat = chats.find(
      (chat) => chat.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingChat) {
      setSelectedId(existingChat.id);
      setManualContact(null);
    } else {
      const contact = {
        id: name.toLowerCase(),
        name,
        messages: [],
        message: "",
        time: "",
        color: colors[chats.length % colors.length],
      };

      setManualContact(contact);
      setSelectedId(contact.id);
    }

    setNewContact("");
    setShowNewChat(false);
    setMobileChatOpen(true);
    setError("");
  }

  async function sendMessage(event) {
    event.preventDefault();

    const text = message.trim();

    if (!text || !selectedChat) return;

    try {
      setError("");

      const res = await fetch("/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: currentUser,
          to: selectedChat.name,
          msg: text,
          created_at: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        throw new Error("Message not saved.");
      }

      await loadChats();
      setMessage("");
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditing(chat) {
    setEditingId(chat._id);
    setEditText(chat.msg || "");
    setOpenMenuId(null);
    setError("");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditText("");
    setError("");
  }

  async function saveEdit(event, chat) {
    event.preventDefault();

    const updatedMessage = editText.trim();

    if (!updatedMessage) {
      setError("Empty message can not be sent.");
      return;
    }

    if (updatedMessage.length > 50) {
      setError("Message can not exceed 50 characters.");
      return;
    }

    try {
      setSavingEdit(true);
      setError("");

      const res = await fetch(`/chats/${chat._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: chat.from,
          to: chat.to,
          msg: updatedMessage,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Message did not update.");
      }

      await loadChats();
      setEditingId(null);
      setEditText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteMessage(chat) {
    const confirmed = window.confirm(
      "Do you want to delete this message permanently?",
    );

    if (!confirmed) {
      setOpenMenuId(null);
      return;
    }

    try {
      setError("");

      const res = await fetch(`/chats/${chat._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Message did not delete .");
      }

      await loadChats();
      setOpenMenuId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-100 text-slate-800">
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={startNewChat}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="mb-2 text-xl font-bold">Start New Chat</h2>

            <p className="mb-4 text-sm text-slate-500">
              Enter the contact's name.
            </p>

            <input
              autoFocus
              type="text"
              value={newContact}
              onChange={(event) => setNewContact(event.target.value)}
              placeholder="e.g. Ali"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewChat(false);
                  setNewContact("");
                }}
                className="rounded-xl px-4 py-2 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!newContact.trim()}
                className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-40"
              >
                Start Chat
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Sidebar */}
      <aside
        className={`${
          mobileChatOpen ? "hidden" : "flex"
        } w-full flex-col border-r border-slate-200 bg-white md:flex md:w-96`}
      >
        <header className="flex items-center justify-between border-b border-[#e9edef] bg-[#f0f2f5] px-5 py-4 text-[#111b21]">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#008069]">
              WhatsApp
            </h1>
            <p className="mt-1 text-xs text-[#667781]">Your conversations</p>
            <select
              value={currentUser}
              onChange={(event) => {
                setCurrentUser(event.target.value);
                setTypingUser("");
                setMessage("");
                setSelectedId(
                  event.target.value === "shayan" ? "abdullah" : "shayan",
                );
              }}
              className="mt-3 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="shayan">Logged in: Shayan</option>
              <option value="saif">Logged in: Saif</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowNewChat(true)}
            title="Start a new chat"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl hover:bg-white/25"
          >
            +
          </button>
        </header>

        <div className="p-4">
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="px-5 pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
          Recent chats
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <p className="p-5 text-sm text-slate-500">Loading chats...</p>
          )}

          {!loading &&
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => {
                  setSelectedId(chat.id);
                  setMobileChatOpen(true);
                }}
                className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${
                  selectedChat?.id === chat.id ? "bg-emerald-50" : ""
                }`}
              >
                <img
                  src={getProfilePicture(chat.name)}
                  alt={chat.name}
                  className="h-12 w-12 shrink-0 rounded-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="truncate font-semibold">{chat.name}</h2>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {chat.time}
                    </span>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {chat.message}
                  </p>
                </div>
              </button>
            ))}

          {!loading && filteredChats.length === 0 && (
            <p className="p-5 text-sm text-slate-500">
              {error || "No conversations found."}
            </p>
          )}
        </div>

        <footer className="border-t border-slate-200 p-4 text-xs text-slate-400">
          WhatsApp Chat App · React
        </footer>
      </aside>

      
      <main
        className={`${
          mobileChatOpen ? "flex" : "hidden"
        } min-w-0 flex-1 flex-col md:flex`}
      >
        {selectedChat ? (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <button
                onClick={() => setMobileChatOpen(false)}
                className="rounded-lg p-2 hover:bg-slate-100 md:hidden"
              >
                ←
              </button>

              <img
                src={getProfilePicture(selectedChat.name)}
                alt={selectedChat.name}
                className="h-11 w-11 shrink-0 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              <div>
                <h2 className="font-bold">{selectedChat.name}</h2>
                <p
                  className={`mt-1 text-xs ${
                    typingUser
                      ? "text-emerald-600"
                      : selectedChatIsOnline
                        ? "text-emerald-600"
                        : "text-slate-400"
                  }`}
                >
                  {typingUser
                    ? `${typingUser} is typing...`
                    : selectedChatIsOnline
                      ? "● Online"
                      : "○ Offline"}
                </p>
              </div>
            </header>

            <section className="flex flex-1 flex-col gap-3 overflow-y-auto bg-[#efeae2] p-4 sm:p-7">
              <div className="mx-auto mb-2 rounded-lg bg-[#fff7df] px-4 py-2 text-center text-xs text-slate-600 shadow-sm">
                Your personal conversations
              </div>

              {selectedChat.messages.map((chat) => {
                const outgoing =
                  (chat.from || "").toLowerCase() === currentUser.toLowerCase();

                const isEditing = editingId === chat._id;

                return (
                  <div
                    key={chat._id}
                    className={`flex ${
                      outgoing ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!outgoing && (
                      <img
                        src={getProfilePicture(chat.from)}
                        alt={chat.from}
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    {outgoing && (
                      <img
                        src={getProfilePicture(currentUser)}
                        alt={currentUser}
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div
                      className={`relative w-fit max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[80%] ${
                        outgoing
                          ? "rounded-tr-sm bg-[#d9fdd3]"
                          : "rounded-tl-sm bg-white"
                      }`}
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(event) => saveEdit(event, chat)}
                          className="min-w-52 space-y-2"
                        >
                          <input
                            autoFocus
                            value={editText}
                            maxLength={50}
                            onChange={(event) =>
                              setEditText(event.target.value)
                            }
                            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                          />

                          <p className="text-right text-xs text-slate-500">
                            {editText.length}/50
                          </p>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={savingEdit}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-black/5"
                            >
                              Cancel
                            </button>

                            <button
                              type="submit"
                              disabled={savingEdit || !editText.trim()}
                              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                            >
                              {savingEdit ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <p className="min-w-0 flex-1 break-word text-sm leading-6">
                              {chat.msg}
                            </p>

                            
                            {outgoing && (
                              <div className="relative -mr-2 -mt-2 shrink-0">
                                <button
                                  type="button"
                                  title="Message options"
                                  aria-label="Message options"
                                  onClick={() =>
                                    setOpenMenuId(
                                      openMenuId === chat._id ? null : chat._id,
                                    )
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-full text-lg text-slate-600 hover:bg-black/10"
                                >
                                  ⋮
                                </button>

                                {openMenuId === chat._id && (
                                  <div className="absolute right-0 top-8 z-10 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                                    <button
                                      type="button"
                                      onClick={() => startEditing(chat)}
                                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-100"
                                    >
                                      ✏️ Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => deleteMessage(chat)}
                                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                                    >
                                      🗑️ Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="mt-1 flex items-center justify-end gap-1 text-[9px] leading-none text-slate-500">
                            {chat.updatedAt && <span>edited ·</span>}
                            <span>{formatTime(chat.created_at)}</span>

                            {outgoing && (
                              <span
                                className={
                                  chat.seen ? "text-sky-500" : "text-slate-400"
                                }
                                title={chat.seen ? "Seen" : "Sent"}
                              >
                                {chat.seen ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>

            {error && (
              <p className="bg-red-50 px-4 py-2 text-sm text-red-600">
                DEBUG: {typingUser || "EMPTY"}
                {error}
              </p>
            )}

            <form
              onSubmit={sendMessage}
              className="flex items-center gap-3 border-t border-slate-200 bg-white p-4"
            >
              <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={(event) => {
                  const value = event.target.value;
                  setMessage(value);

                  if (!selectedChat || !socketRef.current) return;

                  const chatData = {
                    from: currentUser,
                    to: selectedChat.name,
                  };

                  clearTimeout(typingTimeoutRef.current);

                  if (value.trim()) {
                    socketRef.current.emit("typing", chatData);

                    typingTimeoutRef.current = setTimeout(() => {
                      socketRef.current?.emit("stopTyping", chatData);
                    }, 4000);
                  } else {
                    socketRef.current.emit("stopTyping", chatData);
                  }
                }}
                className="min-w-0 flex-1 rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                type="submit"
                disabled={!message.trim()}
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
              >
                Send ➤
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            {loading ? "Loading chats..." : "No conversations available"}
          </div>
        )}
      </main>
    </div>
  );
}
