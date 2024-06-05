import mongoose, { Schema , Document } from "mongoose";
import bcrypt from 'bcrypt';

interface USER extends Document {
    name: string;
    email: string;
    password: string;
    userType: 'ADMIN' | 'USER'
    verificationStatus: boolean;
    friends : string[],
    createdAt: Date;
    updatedAt: Date;
    lastSeen : Date;
    status: 'active'| 'inactive';
}

const UserSchema = new Schema<USER>({
    name : { type : String, require : true },
    email : { type : String, require : true, unique : true },
    password : { type : String, require : true},
    userType : { type : String, enum: ['ADMIN' , 'USER'], default : 'USER' },
    verificationStatus : { type : Boolean, default : false },
    friends : {type : [String]},
    status: { type: String, enum: ['active', 'inactive'], default: 'active'},
    lastSeen : { type: Date, default : Date.now }
    }, { timestamps: true }
);


export const UserModel = mongoose.model('User', UserSchema)

export const hashPasswrd = async (password : string) : Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    return hashPassword
}

export const checkValidation = async (email: string, password: string): Promise<USER | null> => {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return null;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return null;
    }
  
    return user; 
};

export const getUserById = async (userId: string): Promise<USER | null> => {
    try {
        const user = await UserModel.findById(userId);
        return user;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        return null;
    }
};
export const getUserByEmail = async (email: string): Promise<USER | null> => {
    try {
        const user = await UserModel.findOne({ email });
        return user;
    } catch (error) {
        console.error('Error finding user by email:', error);
        return null;
    }
};

export const getUsersByIds = async (userIds: string[]): Promise<USER[]> => {
    try {
        const users = await UserModel.find({ _id: { $in: userIds } });
        return users;
    } catch (error) {
        console.error('Error finding users by IDs:', error);
        return [];
    }
};