import express, { Router } from "express";
const router : Router = express.Router()
import { Friends } from "../controllers/friends.controllers.js";
import { checkToken } from "../middleware/checkToken.js";
const friendController = new Friends()
//routes
router.post('/get-friends', checkToken , friendController.getFriends)
router.post('/add-friend', checkToken , friendController.addFriend)

//export
export default router;