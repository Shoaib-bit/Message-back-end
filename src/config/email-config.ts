import nodemailer from "nodemailer";
import * as dotenv from 'dotenv';

dotenv.config();

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER?? 'default',
        pass: process.env.SMTP_PASS?? 'default'
    }
});

