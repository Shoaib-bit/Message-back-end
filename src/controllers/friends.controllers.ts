import express from "express";
import { UserModel, getUserByEmail, getUserById, getUsersByIds } from "../models/user.js";
import { getLastMessage } from "../models/messages.js";
export class Friends{
    async getFriends(req : express.Request, res : express.Response) {
        try{
            if(req.body.user._id) {
                if(req.body.hasOwnProperty('friendsIds')) {
                    res.status(201).send({
                        success : false,
                        data : null,
                        msg : 'friendsIds key required'
                    });
                    return
                }
                const id = req.body.user._id
                const friendsId = req.body.friendsId

                const users = await getUsersByIds(friendsId)
                let friends = []
              
                for (const user of users) {
                    const message = await getLastMessage(id, user._id);
                    const singleFriend = {
                        _id: user._id,
                        name: user.name,
                        lastMessage: '',
                        lastSeen: new Date(),
                        notify : 0
                    };
                    if(message) {
                        singleFriend.lastMessage = message.message
                        singleFriend.lastSeen = message.createdAt
                    } 
                    friends.push(singleFriend);
                }
                
                res.status(201).send({
                    success : true,
                    data : friends,
                    msg : 'Succuessfully get friends'
                });
                
                

            } else {
                res.status(400).send(`Not Authorized`);
            }
        }catch(err) {

            console.error("Error:", err);
            res.status(500).send(`Internal Server Error ${err}`);
        }
    }
    async addFriend(req : express.Request, res : express.Response) {
        try{
            if(req.body.user?._id) {
                if(!req.body.hasOwnProperty('newFriendEmail')) {
                    res.status(201).send({
                        success : false,
                        data : null,
                        msg : 'newFriendEmail key required'
                    });
                    return
                }
                const friendUser = await getUserByEmail(req.body.newFriendEmail) 
                if(!friendUser) {
                    res.status(201).send({
                        success : false,
                        data : null,
                        msg : 'User Not found'
                    });
                    return
                }
                const ownUser = await getUserById(req.body.user?._id)
                if(!ownUser) {
                    res.status(201).send({
                        success : false,
                        data : null,
                        msg : 'SomeThing Went Wrong'
                    });
                    return
                } 
                ownUser.friends.forEach(async(e) => {
                    if(e == friendUser.id) {
                        const singleFriend = {
                            _id : friendUser._id,
                            name : friendUser.name,
                            lastMessage : '',
                            lastSeen: new Date(),
                            notify : 0
                        }
                        const message = await getLastMessage(friendUser._id, ownUser._id);
                    
                        if(message) {
                            singleFriend.lastMessage = message.message
                            singleFriend.lastSeen = message.createdAt
                        } 

                        res.status(200).send({
                            success : false,
                            data : singleFriend,
                            msg : 'Add Successfully'
                        });
                        return
                    }
                })
                await UserModel.updateOne(
                    { _id: ownUser._id },
                    { $push: { friends: friendUser._id } }
                );
                const singleFriend = {
                    _id : friendUser._id,
                    name : friendUser.name,
                    lastMessage : '',
                    lastSeen : new Date(),
                    notify : 0
                }
                res.status(200).send({
                    success : false,
                    data : singleFriend,
                    msg : 'Add Successfully'
                });
                return
            } else {
                res.status(400).send(`Not Authorized`);
                return
            }
        }catch(err) {
            console.error("Error:", err);
            res.status(500).send(`Internal Server Error ${err}`);
        }
    }
}
