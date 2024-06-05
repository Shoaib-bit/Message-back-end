import express from "express";
import cors from "cors";
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import auth_route from "./routes/auth.route.js";
import friends_route from "./routes/friends.route.js";
import message_route from "./routes/messages.route.js"
import { connectDB } from './config/db-connection.js';
import { getUserById, getUsersByIds } from "./models/user.js";
import { MessagesModel, getLastMessage, getMessages } from "./models/messages.js";
import { Messages } from "./controllers/messages.controller.js";

connectDB();
const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new SocketIOServer(server, {
    cors: {
        origin: "*"
    }
});


const onlineUsers = new Map()

io.on('connection', async (socket) => {
    console.log('A user connected via WebSocket:', socket.id);
    socket.on('add-new', (userId : string) => {
        onlineUsers.set(userId , socket.id)
    })
    socket.on('chat-message', async (data) => {
        if (!data.sender_id || !data.receiver_id) {
            socket.emit('message-send-resp', {
                error: true,
                msg: 'Sender or Receiver ID not Found'
            });
            return;
        } 
        if (data.message == '') {
            socket.emit('message-send-resp', {
                error: true,
                msg: 'Empty Message'
            });
            return;
        }
        
        const msgData = {
            sender_id: data.sender_id,
            receiver_id: data.receiver_id,
            message: data.message
        };
        MessagesModel.create(msgData)
            .then(async (sendedMessage) => {
                console.log('This : ' ,onlineUsers.get(data.receiver_id))
                const to = onlineUsers.get(data.receiver_id)
                const me = onlineUsers.get(data.sender_id)
                console.log('TO : ',to)

                io.to(to).emit('chat-message', {
                    error: false,
                    msg: sendedMessage,
                });
                io.to(me).emit('chat-message', {
                    error: false,
                    msg: sendedMessage,
                });
            })
            .catch((error) => {
                io.emit('chat-message', {
                    error: true,
                    msg: error,
                    
                });
            });
    });
    socket.on(`chat-list`, async (data) => {
        console.log(data)
        if (data.userId == '') {
            io.emit(`chat-list-response`, {
                error: true,
                message: 'User Id Not Found'
            }); 
            return;
        }
        try {
            const ownUser = await getUserById(data.userId); 
            if (!ownUser) {
                io.emit(`chat-list-response`, {
                    error: true,
                    message: 'User Not Found'
                });
                return;
            }     
            const users = await getUsersByIds(ownUser.friends);
            let friends = [];
            for (const user of users) {
                const messages : any = await getMessages(user._id, ownUser._id);
                const lastMessage = await getLastMessage(user._id, ownUser._id);
                const singleFriend = {
                    _id: user._id,
                    name: user.name,
                    lastMessage: '',
                    lastSeen: new Date(),
                    notify: 0,
                    messages: []
                };
                if (messages && lastMessage) {
                    let notify = 0;
                    messages.forEach((e : any) => {
                        if (!e.seen) {
                            notify++;
                        }
                    });
                    singleFriend.lastMessage = lastMessage.message;
                    singleFriend.lastSeen = lastMessage.createdAt;
                    singleFriend.messages = messages;
                } 
                friends.push(singleFriend);
            }
            io.to(socket.id).emit(`chat-list-response`, {
                error: false,
                chatList: friends,
            });      
        } catch (error) {
            io.to(socket.id).emit(`chat-list-response`, {
                error: true,
                chatList: []
            });
        }
    });
    

    
    socket.on('disconnect', () => {
        console.log('User disconnected from WebSocket');
    });
});

app.use('/api/', auth_route);
app.use('/api/friends/', friends_route);
app.use('/api/messages/', message_route);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
