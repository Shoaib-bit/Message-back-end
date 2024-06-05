import mongoose, { Schema , Document } from "mongoose";

interface VERIFICATION extends Document {
    userId : string;
    code : string;
    verificationType : 'EMAIL' | 'FORGET',
    expiryDate : Date
    createdAt: Date;
    updatedAt: Date;
    forget ?: Boolean
    
}

const VerificationSchema = new Schema<VERIFICATION>({
    userId : { type : String, require : true },
    code : { type : String, require : true, unique : true },
    verificationType : { type : String, enum: ['EMAIL' , 'FORGET'], default : 'EMAIL' },
    expiryDate: { type: Date, required: true },
    forget: { type: Boolean, default : false, }
    }, { timestamps: true }
);

export const VerificationModel = mongoose.model('Verifications', VerificationSchema)
export const codeExists = async (code: string): Promise<boolean> => {
    try {
      const existingCode = await VerificationModel.findOne({ code });
      return !!existingCode;
    } catch (error) {
      console.error('Error checking if code exists:', error);
      return false; 
    }
};

export const getVerificationDetail = async (code: string): Promise< VERIFICATION | null> => {
    try {
        const codeDetail = await VerificationModel.findOne({ code });
        return codeDetail;
    } catch (error) {
        console.error('Error finding verification detail by code:', error);
        return null;
    }
};