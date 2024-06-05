import express, { Router } from "express";
import { Auth } from "../controllers/auth.controller.js";
const authController = new Auth();
const router : Router = express.Router()

//routes
router.post('/signup', authController.signup )
router.post('/login', authController.login )
router.post('/verify-account', authController.verifyAccount )
router.post('/resend-code', authController.resendCode )
router.post('/forget-password', authController.forgetPassword )
router.post('/verify-forget', authController.verifyForgetRequest )
router.post('/change-password', authController.changePassword )

//export
export default router;