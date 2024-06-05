import express, { Router } from "express";
const router : Router = express.Router()

import { checkToken } from "../middleware/checkToken.js";
import { Messages } from "../controllers/messages.controller.js";
const MessageController = new Messages()
//routes
router.post('/get-messages', checkToken , MessageController.getMessages)

//export
export default router;