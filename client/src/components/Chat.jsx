import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { Button, List, Avatar, Input, Badge, Modal, Card } from "antd";
import {
  MessageOutlined,
  UserOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
  SendOutlined,
} from "@ant-design/icons";
import axios from "axios";
import moment from "moment";

const Chat = ({ courseId, instructorId, triggerButton }) => {
  const [visible, setVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [socket, setSocket] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  const getCourseTitle = (course) => {
    if (!course) return "";
    return course.courseTitle || course.title || "";
  };

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

  // Check for mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      const newSocket = io(
        import.meta.env.VITE_API_URL || "http://localhost:8080",
        {
          withCredentials: true,
          query: { userId: user._id },
        }
      );

      newSocket.on("connect", () => {
        console.log("Connected to socket server");
        newSocket.emit("register", user._id);
      });

      newSocket.on("newMessage", (message) => {
        if (activeChat && activeChat._id === message.chat) {
          setMessages((prev) => [...prev, message]);
          markMessagesAsRead([message._id]);
        } else {
          updateUnreadCount(message.chat);
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [user]);

  useEffect(() => {
    if (visible && user) {
      fetchChats();
    }
  }, [visible, user]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchChats = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/chat/chats`, {
        withCredentials: true,
      });
      setChats(data.data);

      const counts = {};
      data.data.forEach((chat) => {
        counts[chat._id] =
          chat.lastMessage &&
          !chat.lastMessage.read &&
          chat.lastMessage.receiver._id === user._id
            ? 1
            : 0;
      });
      setUnreadCounts(counts);
    } catch (error) {
      console.error("Failed to fetch chats:", error);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/chat/messages/${chatId}`,
        {
          withCredentials: true,
        }
      );
      setMessages(data.data);

      const unreadMessages = data.data
        .filter((msg) => !msg.read && msg.receiver._id === user._id)
        .map((msg) => msg._id);

      if (unreadMessages.length > 0) {
        await axios.post(
          `${API_BASE_URL}/chat/mark-read`,
          { messageIds: unreadMessages },
          {
            withCredentials: true,
          }
        );
        updateUnreadCount(chatId, -unreadMessages.length);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const markMessagesAsRead = async (messageIds) => {
    try {
      await axios.post(
        `${API_BASE_URL}/chat/mark-read`,
        { messageIds },
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const updateUnreadCount = (chatId, change = 1) => {
    setUnreadCounts((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || 0) + change,
    }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !activeChat) return;

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/chat/send`,
        {
          courseId: activeChat.course._id,
          receiverId:
            user.role === "student"
              ? activeChat.instructor._id
              : activeChat.student._id,
          content: inputMessage,
        },
        { withCredentials: true }
      );

      setMessages((prev) => [
        ...prev,
        {
          ...data.data,
          sender: user,
          receiver:
            user.role === "student"
              ? activeChat.instructor
              : activeChat.student,
        },
      ]);
      setInputMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startNewChat = async () => {
    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/chat/send`,
        {
          courseId,
          receiverId: instructorId,
          content: "Hello, I would like to start a chat regarding the course.",
        },
        { withCredentials: true }
      );

      setInputMessage("");
      fetchChats();
      setActiveChat(data.chat);
    } catch (error) {
      console.error("Failed to start new chat:", error);
    }
  };

  const totalUnreadCount = Object.values(unreadCounts).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <>
      {triggerButton ? (
        React.cloneElement(triggerButton, {
          onClick: () => {
            setVisible(true);
            if (courseId) {
              const existingChat = chats.find((c) => c.course._id === courseId);
              if (existingChat) {
                setActiveChat(existingChat);
              }
            }
          },
        })
      ) : (
        <Badge count={totalUnreadCount} offset={[-5, 5]} size="small">
          <Button
            type="text"
            icon={<MessageOutlined />}
            onClick={() => setVisible(true)}
            style={{
              display: "flex",
              alignItems: "center",
              color: "#2c3e50",
              fontWeight: 500,
            }}
          >
            Messages
          </Button>
        </Badge>
      )}

      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center" }}>
            {isMobileView && activeChat && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => setActiveChat(null)}
                style={{ marginRight: 8 }}
              />
            )}
            {activeChat ? (
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  src={
                    user.role === "student"
                      ? activeChat.instructor?.photoUrl ||
                        "https://github.com/shadcn.png"
                      : activeChat.student?.photoUrl ||
                        "https://github.com/shadcn.png"
                  }
                  icon={<UserOutlined />}
                  style={{ backgroundColor: "#1890ff" }}
                />
                <div style={{ marginLeft: 12 }}>
                  <div style={{ fontWeight: 500, color: "#2c3e50" }}>
                    {user.role === "student"
                      ? activeChat.instructor?.name
                      : activeChat.student?.name}
                  </div>
                  {activeChat.course && (
                    <div style={{ color: "#7f8c8d", fontSize: 12 }}>
                      {getCourseTitle(activeChat.course)}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <span style={{ fontWeight: 500, color: "#2c3e50" }}>
                Messages
              </span>
            )}
          </div>
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={isMobileView ? "90%" : 800}
        bodyStyle={{ padding: 0 }}
        closable={false}
        closeIcon={<CloseOutlined style={{ color: "#7f8c8d" }} />}
        style={{ top: 20 }}
        className="chat-modal"
      >
        <div
          style={{
            display: "flex",
            height: isMobileView ? "70vh" : "60vh",
            flexDirection: isMobileView && activeChat ? "column" : "row",
          }}
        >
          {(!isMobileView || !activeChat) && (
            <div
              style={{
                width: isMobileView ? "100%" : 250,
                borderRight: "1px solid #ecf0f1",
                overflowY: "auto",
                backgroundColor: "#f8f9fa",
              }}
            >
              <div
                style={{
                  padding: 16,
                  borderBottom: "1px solid #ecf0f1",
                  backgroundColor: "#fff",
                }}
              >
                <Input.Search
                  placeholder="Search chats..."
                  style={{ width: "100%" }}
                />
              </div>
              <List
                dataSource={chats}
                renderItem={(chat) => (
                  <List.Item
                    onClick={() => setActiveChat(chat)}
                    style={{
                      cursor: "pointer",
                      padding: 12,
                      backgroundColor:
                        activeChat?._id === chat._id ? "#e8f4fd" : "#fff",
                      borderBottom: "1px solid #ecf0f1",
                      transition: "background-color 0.3s",
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          src={
                            user.role === "student"
                              ? chat.instructor?.photoUrl ||
                                "https://github.com/shadcn.png"
                              : chat.student?.photoUrl ||
                                "https://github.com/shadcn.png"
                          }
                          icon={<UserOutlined />}
                          style={{ backgroundColor: "#1890ff" }}
                        />
                      }
                      title={
                        <div style={{ fontWeight: 500, color: "#2c3e50" }}>
                          {user.role === "student"
                            ? chat.instructor?.name
                            : chat.student?.name}
                        </div>
                      }
                      description={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "#7f8c8d",
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "70%",
                            }}
                          >
                            {chat.lastMessage?.content || "No messages yet"}
                          </span>
                          <span style={{ color: "#bdc3c7", fontSize: 12 }}>
                            {moment(chat.lastMessage?.timestamp).format(
                              "h:mm A"
                            )}
                          </span>
                        </div>
                      }
                    />
                    {unreadCounts[chat._id] > 0 && (
                      <Badge
                        count={unreadCounts[chat._id]}
                        style={{ backgroundColor: "#1890ff" }}
                      />
                    )}
                  </List.Item>
                )}
              />
              {user?.role === "student" && courseId && (
                <div style={{ padding: 16 }}>
                  <Button
                    type="primary"
                    block
                    onClick={startNewChat}
                    style={{
                      backgroundColor: "#1890ff",
                      borderColor: "#1890ff",
                    }}
                  >
                    New Chat
                  </Button>
                </div>
              )}
            </div>
          )}

          {(!isMobileView || activeChat) && (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#fff",
              }}
            >
              {activeChat ? (
                <>
                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      padding: 16,
                      backgroundImage:
                        "linear-gradient(to bottom, #f8f9fa 0%, #fff 100%)",
                    }}
                  >
                    {messages.length === 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "100%",
                          color: "#7f8c8d",
                        }}
                      >
                        No messages yet. Start the conversation!
                      </div>
                    )}
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        style={{
                          display: "flex",
                          justifyContent:
                            message.sender._id === user._id
                              ? "flex-end"
                              : "flex-start",
                          marginBottom: 16,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "80%",
                            borderRadius: 12,
                            padding: "10px 14px",
                            backgroundColor:
                              message.sender._id === user._id
                                ? "#1890ff"
                                : "#ecf0f1",
                            color:
                              message.sender._id === user._id
                                ? "white"
                                : "#2c3e50",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            position: "relative",
                          }}
                        >
                          <div style={{ wordBreak: "break-word" }}>
                            {message.content}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              marginTop: 4,
                              fontSize: 11,
                              color:
                                message.sender._id === user._id
                                  ? "rgba(255,255,255,0.7)"
                                  : "rgba(0,0,0,0.45)",
                            }}
                          >
                            {moment(message.timestamp).format("h:mm A")}
                            {message.sender._id === user._id && (
                              <span style={{ marginLeft: 4 }}>
                                {message.read ? (
                                  <span style={{ color: "#70c1ff" }}>✓✓</span>
                                ) : (
                                  <span>✓</span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  <div
                    style={{
                      padding: 16,
                      borderTop: "1px solid #ecf0f1",
                      backgroundColor: "#fff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Input.TextArea
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        onPressEnter={(e) => {
                          if (!e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        style={{
                          borderRadius: 20,
                          padding: "8px 16px",
                          flex: 1,
                        }}
                      />
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<SendOutlined />}
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim()}
                        style={{
                          backgroundColor: "#1890ff",
                          borderColor: "#1890ff",
                          width: 40,
                          height: 40,
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    padding: 24,
                    textAlign: "center",
                    backgroundColor: "#f8f9fa",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      color: "#7f8c8d",
                      marginBottom: 16,
                    }}
                  >
                    {user?.role === "student" && courseId
                      ? "Start a new conversation with your instructor"
                      : "Select a chat to view messages"}
                  </div>
                  {user?.role === "student" && courseId && (
                    <Button
                      type="primary"
                      onClick={startNewChat}
                      style={{
                        backgroundColor: "#1890ff",
                        borderColor: "#1890ff",
                      }}
                    >
                      Start New Chat
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default Chat;
