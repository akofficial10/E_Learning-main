import express from "express";
import  isAuthenticated  from "../middlewares/isAuthenticated.js";
import {
  sendMessage,
  getChats,
  getMessages,
  markAsRead,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.post("/send", isAuthenticated, sendMessage);
router.get("/chats", isAuthenticated, getChats);
router.get("/messages/:chatId", isAuthenticated, getMessages);
router.post("/mark-read", isAuthenticated, markAsRead);

export default router;
