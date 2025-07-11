import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useSelector } from "react-redux";
import { Button, List, Avatar, Input, Badge, Modal, Card } from "antd";
import {
  MessageOutlined,
  UserOutlined,
  CloseOutlined,
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
  const messagesEndRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

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
        <Button
          type="text"
          icon={<MessageOutlined />}
          onClick={() => setVisible(true)}
          style={{ display: "flex", alignItems: "center" }}
        >
          Messages
          {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
            <Badge
              count={Object.values(unreadCounts).reduce((a, b) => a + b, 0)}
              style={{ marginLeft: 8 }}
            />
          )}
        </Button>
      )}

      <Modal
        title={
          activeChat ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Avatar
                src={
                  user.role === "student"
                    ? activeChat.instructor.avatar
                    : activeChat.student.avatar
                }
                icon={<UserOutlined />}
              />
              <span style={{ marginLeft: 8 }}>
                {user.role === "student"
                  ? activeChat.instructor.name
                  : activeChat.student.name}
              </span>
              <span style={{ marginLeft: 8, color: "#888" }}>
                ({activeChat.course.title})
              </span>
            </div>
          ) : (
            "Select a chat"
          )
        }
        open={visible}
        onCancel={() => setVisible(false)}
        footer={null}
        width={800}
        styles={{ body: { padding: 0 } }}
        closable={false}
        closeIcon={<CloseOutlined />}
      >
        <div style={{ display: "flex", height: "60vh" }}>
          <div
            style={{
              width: 250,
              borderRight: "1px solid #f0f0f0",
              overflowY: "auto",
            }}
          >
            <List
              dataSource={chats}
              renderItem={(chat) => (
                <List.Item
                  onClick={() => setActiveChat(chat)}
                  style={{
                    cursor: "pointer",
                    padding: 12,
                    backgroundColor:
                      activeChat?._id === chat._id ? "#f0f7ff" : "transparent",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={
                          user.role === "student"
                            ? chat.instructor.avatar
                            : chat.student.avatar
                        }
                        icon={<UserOutlined />}
                      />
                    }
                    title={
                      user.role === "student"
                        ? chat.instructor.name
                        : chat.student.name
                    }
                    description={chat.course.title}
                  />
                  {unreadCounts[chat._id] > 0 && (
                    <Badge count={unreadCounts[chat._id]} />
                  )}
                  <div style={{ color: "#888", fontSize: 12 }}>
                    {moment(chat.lastMessage?.timestamp).format("h:mm A")}
                  </div>
                </List.Item>
              )}
            />
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {activeChat ? (
              <>
                <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
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
                      <Card
                        size="small"
                        style={{
                          maxWidth: "70%",
                          backgroundColor:
                            message.sender._id === user._id
                              ? "#1890ff"
                              : "#f0f0f0",
                          color:
                            message.sender._id === user._id ? "white" : "black",
                          border: "none",
                        }}
                      >
                        <div>{message.content}</div>
                        <div
                          style={{
                            fontSize: 12,
                            color:
                              message.sender._id === user._id
                                ? "rgba(255,255,255,0.7)"
                                : "rgba(0,0,0,0.45)",
                            textAlign: "right",
                            marginTop: 4,
                          }}
                        >
                          {moment(message.timestamp).format("h:mm A")}
                          {message.sender._id === user._id && (
                            <span style={{ marginLeft: 4 }}>
                              {message.read ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      </Card>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
                  <Input.TextArea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type a message..."
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    onPressEnter={(e) => {
                      if (!e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    onClick={handleSendMessage}
                    style={{ marginTop: 8 }}
                    disabled={!inputMessage.trim()}
                  >
                    Send
                  </Button>
                </div>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {user?.role === "student" && courseId ? (
                  <Button type="primary" onClick={startNewChat}>
                    Start New Chat with Instructor
                  </Button>
                ) : (
                  <div>Select a chat to view messages</div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Chat;