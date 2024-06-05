import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
 
export const connectDB = async () => {
    try{
        const url = process.env.MONGODB_URI ?? 'default'
        mongoose.connect(url);
        console.log('MongoDB Database Connected')
    } catch (e) {
        console.log('Error Occuring : ', e)
    }
}
