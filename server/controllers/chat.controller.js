import { Chat, Message } from "../models/chat.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { emitSocketEvent } from "../utils/socket.js";
import {User} from "../models/user.model.js";

export const sendMessage = async (req, res, next) => {
  try {
    const { courseId, receiverId, content } = req.body;
    const senderId = req.id;
    const senderRole = req.user.role;

    // ✅ FETCH user from DB
    const sender = await User.findById(senderId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check course purchase
   const purchase = await CoursePurchase.findOne({
     userId: senderId,
     courseId: courseId,
     status: "completed",
   });


   if (!purchase && senderRole !== "instructor") {
     return res.status(403).json({
       success: false,
       message: "Purchase the course to chat with instructor",
     });
   }

    // Create and save message
    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      course: courseId,
      content,
    });
    await newMessage.save();

    // Find or create chat
    let chat = await Chat.findOne({
      course: courseId,
      $or: [
        { student: senderId, instructor: receiverId },
        { student: receiverId, instructor: senderId },
      ],
    });

    if (!chat) {
      chat = new Chat({
        student: sender.role === "student" ? senderId : receiverId,
        instructor: sender.role === "instructor" ? senderId : receiverId,
        course: courseId,
        messages: [newMessage._id],
        lastMessage: newMessage._id,
      });
    } else {
      chat.messages.push(newMessage._id);
      chat.lastMessage = newMessage._id;
      chat.updatedAt = Date.now();
    }
    await chat.save();

    // Emit socket event
    emitSocketEvent(req, receiverId.toString(), "newMessage", newMessage);

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req, res) => {
  try {
    const user = await User.findById(req.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = user._id;
    const role = user.role;

    let chats;
    if (role === "student") {
      chats = await Chat.find({ student: userId })
        .populate("instructor", "name avatar")
        .populate("course", "title courseTitle")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });
    } else if (role === "instructor") {
      chats = await Chat.find({ instructor: userId })
        .populate("student", "name avatar")
        .populate("course", "title courseTitle")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });
    }

    res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
      error: error.message,
    });
  }
};


export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId).populate({
      path: "messages",
      populate: [
        { path: "sender", select: "name avatar" },
        { path: "receiver", select: "name avatar" },
      ],
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Check if user is part of this chat
    if (
      ![chat.student.toString(), chat.instructor.toString()].includes(
        userId.toString()
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this chat",
      });
    }

    res.status(200).json({
      success: true,
      data: chat.messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;

    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { read: true } }
    );

    res.status(200).json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};
