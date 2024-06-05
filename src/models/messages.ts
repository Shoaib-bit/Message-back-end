import mongoose, { Schema , Document } from "mongoose";

interface Messages extends Document {
    sender_id ?: string;
    receiver_id ?: string;
    message: string;
    status : 'active' | 'inactive';
    seen : boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MessagesSchema = new Schema<Messages>({
    sender_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    seen: { type: Boolean, default: false },
}, { timestamps: true });

export const MessagesModel = mongoose.model('Messages', MessagesSchema)

export const getMessages = async function (senderId: string, receiverId: string): Promise<Messages[]> {
    try {
        const messages = await MessagesModel.find({
            $or: [
                { sender_id: senderId, receiver_id: receiverId },
                { sender_id: receiverId, receiver_id: senderId }
            ]
        }).exec();
        return messages;
    } catch (error) {
        throw new Error(`Error fetching messages: ${error}`);
    }
};
export const getLastMessage = async function (senderId: string, receiverId: string): Promise<Messages | null> {
    try {
        const messages = await MessagesModel.find({
            $or: [
                { sender_id: senderId, receiver_id: receiverId },
                { sender_id: receiverId, receiver_id: senderId }
            ]
        }).sort({ createdAt: -1 }).limit(1).exec();
        
        return messages.length > 0 ? messages[0] : null;
    } catch (error) {
        throw new Error(`Error fetching last message: ${error}`);
    }
};

