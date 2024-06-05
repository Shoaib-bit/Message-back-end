import express from "express";
import { getMessages } from "../models/messages.js";
export class Messages{
    async getMessages(req : express.Request, res : express.Response) {
        try{
            if(req.body.user._id) {
                if(!req.body.hasOwnProperty('receiver_id')) {
                    res.status(201).send({
                        success : false,
                        data : null,
                        msg : 'receiver_id key required'
                    });
                    return
                }
                const sender_id = req.body.user._id
                const receiver_id = req.body.receiver_id
                const messages = await getMessages(sender_id , receiver_id)
                console.log(messages)
                res.status(201).send({
                    success : true,
                    data : messages,
                    msg : 'Succuessfully get friends'
                });
                return
            } else {
                res.status(400).send(`Not Authorized`);
            }
        }catch(err) {

            console.error("Error:", err);
            res.status(500).send(`Internal Server Error ${err}`);
        }
    }
    
}
