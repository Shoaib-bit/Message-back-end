import express from "express";
import Joi from "joi";
import { generateCode } from "../utility/generateCode.js";
import { UserModel } from "../models/user.js";
import { hashPasswrd } from "../models/user.js";
import { codeExists } from "../models/verification.js";
import { VerificationModel } from "../models/verification.js";
import { transporter } from "../config/email-config.js";
import { checkValidation } from "../models/user.js";
import { generateJWT } from "../utility/gernateToken.js";
import { getVerificationDetail } from "../models/verification.js";
import { getUserById } from "../models/user.js";
import { getUserByEmail } from "../models/user.js";

export class Auth{
    async signup(req : express.Request, res : express.Response) {
        const schema = Joi.object({
            name: Joi.string().required(),
            email: Joi.string().email().required(),
            password: Joi.string().required(),
            confirmPassword : Joi.string()
        })

        try{
            const { error, value } = schema.validate(req.body);
            if(error) {

                res.status(201).send({
                    success : false,
                    data : null,
                    msg : error.details[0].message
                });
                return;
            }
            if(value.password != value.confirmPassword) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Password Not Match with Confirm Password.'
                });
                return
            }
            value.password = await hashPasswrd(value.password)
            UserModel.create(value)
                .then(async (createdUser) => {
                    let code 
                    let codeExit
                    do{
                        code = generateCode(5)
                        codeExit = await codeExists(code)
                    } while (codeExit)
                    const verificationValue = {
                        userId: createdUser._id,
                        code: code,
                        expiryDate: new Date(Date.now() + 10 * 60 * 1000)
                    };
                    VerificationModel.create(verificationValue)
                    .then(async (createdCode) => {
                        const mailOptions = {
                            from: 'Authentication<0345shoaibkhan@gmail.com>',
                            to: createdUser.email,
                            subject: 'Account Verification',
                            text: 'Please find the attached PDF file.',
                            html : `This is Verification Code : <h1>${createdCode.code}</h1>`
                            
                        };
                        transporter.sendMail(mailOptions, async (error, info) => {
                            if (error) {
                              console.error('Error sending email:', error);
                              res.status(500).send({ message: 'Error sending email' });
                            } else {
                              console.log('Email sent:', info.response);
                              res.status(200).send({
                                    success : true,
                                    data : null,
                                    msg : 'Email sent successfully'
                                });
                            }
                          });
                    })
                })
                .catch((error) => {
                    res.status(201).send({
                        success : false,
                        data : null,
                        msg : 'Email already registered'
                    });
                });
        }catch(err) {
            console.error("Error:", err);
            res.status(500).send(`Internal Server Error ${err}`);
        }
    }
    async login(req : express.Request, res : express.Response) {
        const schema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required()
        })

        try{
            const { error, value } = schema.validate(req.body);
            if(error) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : error.details[0].message
                });
                return;
            }
            let user = await checkValidation(value.email, value.password)
            if(!user) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Invalid email or password'
                });
                return;
            }
            if(!user.verificationStatus) {
                let code : string
                let codeExit
                do{
                    code = generateCode(5)
                    codeExit = await codeExists(code)
                } while (codeExit)
                await VerificationModel.updateOne(
                    { user_id: user._id },
                    { $set: { expiryDate: new Date(Date.now() + 10 * 60 * 1000) , code : code} }
                ).then(async () => {
                    const mailOptions = {
                        from: 'Authentication<0345shoaibkhan@gmail.com>',
                        to: user?.email,
                        subject: 'Account Verification',
                        text: 'Please find the attached PDF file.',
                        html : `This is Verification Code : <h1>${code}</h1>`
                    };

                    transporter.sendMail(mailOptions, async (error, info) => {
                        if (error) {
                          console.error('Error sending email:', error);
                          res.status(500).send({ message: 'Error sending email' });
                        } else {
                          console.log('Email sent:', info.response);
                            res.status(201).send({
                                success : false,
                                data : null,
                                msg : 'Verify Your Account',
                                notVerified : true
                            });
                        }
                      });
                })
                return
            }     
            const tokenObj = {
                _id : user._id,
                email : user.email,
                userType : user.userType
            }
            const token = generateJWT(tokenObj)
            let userDetail = {
                id : user._id,
                name : user.name,
                email : user.email,
                userType : user.userType,
                createdAt : user.createdAt,
                updatedAt : user.updatedAt,
                friends : user.friends,
                verificationStatus : user.verificationStatus,
                status : user.status,
                token : token
            }
            res.status(200).send({
                success : true,
                data : userDetail,
                msg : 'Successfully Logined.'
            });

        }catch(err) {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        }
    }
    async verifyAccount(req : express.Request, res : express.Response) {
        try{
            if(!req.body.hasOwnProperty('code')) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Code Not Found'
                });
                return
            }
            const code = req.body.code
            const verificationDetail = await getVerificationDetail(code)
            if(!verificationDetail) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Invalid Code'
                });
                return
            }
            const user = await getUserById(verificationDetail.userId)
            if(!user) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Someting went wrong!'
                });
                return
            }
            if(user.verificationStatus) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'User Already Verified'
                });
                return
            }
            if (new Date(verificationDetail?.expiryDate) < new Date()) {
                res.status(201).send({
                    success: false,
                    data: null,
                    msg: 'Code Expired.'
                });
            } else {
                await UserModel.updateOne(
                    { _id: verificationDetail.userId },
                    { verificationStatus: true }
                );
                const tokenObj = {
                    _id : user._id,
                    email : user.email,
                    userType : user.userType
                }
                const token = generateJWT(tokenObj)
                let userDetail = {
                    id : user._id,
                    name : user.name,
                    email : user.email,
                    userType : user.userType,
                    createdAt : user.createdAt,
                    updatedAt : user.updatedAt,
                    friends : user.friends,
                    verificationStatus : user.verificationStatus,
                    status : user.status,
                    token : token
                }
                res.status(200).send({
                    success : true,
                    data : userDetail,
                    msg : 'Successfully Logined.'
                });
    
            }
            
        }catch(err) {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        }
        
    }
    async resendCode(req : express.Request, res : express.Response) {
        try{
            if(!req.body.hasOwnProperty('email') || !req.body.hasOwnProperty('type')) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'No email or type found'
                });
                return
            }
            const email = req.body.email
            const type = req.body?.type
            let user : any = await getUserByEmail(email)
            if(!user) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Invalid Email'
                });
                return
            }
            if(type != 'forget' && user.verificationStatus) {        
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'User Already Verified.'
                });
                return    
            }
            
            let verificationSetDetail = await VerificationModel.findOne({
                userId: user.id
            })
            if (!verificationSetDetail) {
                res.status(201).send({
                    success: false,
                    data: null,
                    msg: 'No verification set detail found for the user'
                });
                return 
            }
        
            let code : string
            let codeExit
            do{
                code = generateCode(5)
                codeExit = await codeExists(code)
            } while (codeExit)
            if(type == 'forget') {
                const verificationValue = {
                    userId : user._id,
                    code: code,
                    verificationType : 'FORGET',
                    forget : false,
                    expiryDate: new Date(Date.now() + 10 * 60 * 1000)
                };
                await VerificationModel.updateOne(
                    { _id: verificationSetDetail._id },
                    { $set:  verificationValue}
                ).then(async () => {
                    const mailOptions = {
                        from: 'Authentication<0345shoaibkhan@gmail.com>',
                        to: user?.email,
                        subject: 'Account Verification',
                        text: 'Please find the attached PDF file.',
                        html : `This is Verification Code : <h1>${code}</h1>`
                        
                    };
                    transporter.sendMail(mailOptions, async (error, info) => {
                        if (error) {
                          console.error('Error sending email:', error);
                          res.status(500).send({ message: 'Error sending email' });
                        } else {
                          console.log('Email sent:', info.response);
                          res.status(200).send({
                                success : true,
                                data : null,
                                msg : 'Resend Code Has Been Sended.'
                            });
                        }
                      });
                })
            } else {
                await VerificationModel.updateOne(
                    { _id: verificationSetDetail._id },
                    { $set: { expiryDate: new Date(Date.now() + 10 * 60 * 1000) , code : code} }
                ).then(async () => {
                    const mailOptions = {
                        from: 'Authentication<0345shoaibkhan@gmail.com>',
                        to: user?.email,
                        subject: 'Account Verification',
                        text: 'Please find the attached PDF file.',
                        html : `This is Verification Code : <h1>${code}</h1>`
                        
                    };
                    transporter.sendMail(mailOptions, async (error, info) => {
                        if (error) {
                          console.error('Error sending email:', error);
                          res.status(500).send({ message: 'Error sending email' });
                        } else {
                          console.log('Email sent:', info.response);
                          res.status(200).send({
                                success : true,
                                data : null,
                                msg : 'Resend Code Has Been Sended.'
                            });
                        }
                      });
                })
            }
            
            
            
        }catch(err) {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        }
        
    }
    async forgetPassword(req : express.Request, res : express.Response) {
        try{
            if(!req.body.hasOwnProperty('email')) {
                res.status(400).send({
                    success : false,
                    data : null,
                    msg : 'Email is Required'
                });
                return
            }
            const email = req.body.email
            let code : string
            let codeExit
            do{
                code = generateCode(5)
                codeExit = await codeExists(code)
            } while (codeExit)
            let user = await getUserByEmail(email)
            if(!user) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Invalid Email'
                });
                return
            }
            const verificationValue = {
                userId : user._id,
                code: code,
                verificationType : 'FORGET',
                forget : false,
                expiryDate: new Date(Date.now() + 10 * 60 * 1000)
            };
            let verificationSetDetail = await VerificationModel.findOne({
                userId: user._id
            })

            if (verificationSetDetail) {
                await VerificationModel.updateOne(
                    { _id: verificationSetDetail._id },
                    { $set: verificationValue }
                ).then(async () => {
                    const mailOptions = {
                        from: 'Authentication<0345shoaibkhan@gmail.com>',
                        to: user?.email,
                        subject: 'Account Verification',
                        text: 'Please find the attached PDF file.',
                        html : `This is Verification Code : <h1>${code}</h1>`
                        
                    };
                    transporter.sendMail(mailOptions, async (error, info) => {
                        if (error) {
                          console.error('Error sending email:', error);
                          res.status(500).send({ message: 'Error sending email' });
                        } else {
                          console.log('Email sent:', info.response);
                          res.status(200).send({
                                success : true,
                                data : null,
                                msg : 'Code has been sended On your Mail.'
                            });
                        }
                      });
                })
            } else {
                VerificationModel.create(verificationValue)
                .then(async (createdCode) => {
                    const mailOptions = {
                        from: 'Authentication<0345shoaibkhan@gmail.com>',
                        to: user?.email,
                        subject: 'Account Verification',
                        text: 'Please find the attached PDF file.',
                        html : `This is Verification Code : <h1>${createdCode.code}</h1>`
                        
                    };
                    transporter.sendMail(mailOptions, async (error, info) => {
                        if (error) {
                            console.error('Error sending email:', error);
                            res.status(500).send({ message: 'Error sending email' });
                        } else {
                            console.log('Email sent:', info.response);
                            res.status(200).send({
                                success : true,
                                data : null,
                                msg : 'Code has been sended On your Mail.'
                            });
                        }
                        });
                })
            }
            
        }catch(err) {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        }
        
    }
    async verifyForgetRequest(req : express.Request, res : express.Response) {
        try{
            if(!req.body.hasOwnProperty('code')) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Code Not Found'
                });
                return
            }
            const code = req.body.code
            const verificationDetail = await getVerificationDetail(code)
            if(!verificationDetail) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Invalid Code'
                });
                return
            }
            const user = await getUserById(verificationDetail.userId)
            if(!user) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Someting went wrong!'
                });
                return
            }
            if (new Date(verificationDetail?.expiryDate) < new Date()) {
                res.status(201).send({
                    success: false,
                    data: null,
                    msg: 'Code Expired.'
                });
            } else {
                await VerificationModel.updateOne(
                    { _id: verificationDetail._id },
                    { forget: true }
                );
                await UserModel.updateOne(
                    { _id: verificationDetail.userId },
                    { verificationStatus: true }
                );
                res.status(201).send({
                    success: true,
                    data: null,
                    msg: 'Your request has been Verifed.'
                });
            }
            
        }catch(err) {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        }
        
    }
    async changePassword(req : express.Request, res : express.Response) {
        try{
            if(!req.body.hasOwnProperty('email')) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Some thing Went Wrong'
                });
                return
            }
            if(!req.body.hasOwnProperty('password') || !req.body.hasOwnProperty('confirmPassword')) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Password is required.'
                });
                return
            }

            const email = req.body.email
            const pass = req.body.password
            const confirmPass = req.body.confirmPassword
            if(pass != confirmPass) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Password Not Match with Confirm Password'
                });
                return
            }
            let user = await getUserByEmail(email)
            if(!user) {
                res.status(201).send({
                    success : false,
                    data : null,
                    msg : 'Something Went wrong'
                });
                return
            }

            let verificationSetDetail = await VerificationModel.findOne({
                userId: user._id
            })

            if (!verificationSetDetail) {
                res.status(201).send({
                    success: false,
                    data: null,
                    msg: 'No Forget Request Found.'
                });
                return 
            }
            if (!verificationSetDetail.forget) {
                res.status(201).send({
                    success: false,
                    data: null,
                    msg: 'No Forget Request Verified.'
                });
                return 
            }
            await UserModel.updateOne(
                { _id: user._id },
                { password: await hashPasswrd(pass) }
            );
            await VerificationModel.deleteOne({
                _id : verificationSetDetail._id
            })
            res.status(200).send({
                success: true,
                data: null,
                msg: 'Your Password has been changed.'
            });

        }catch(err) {
            console.error("Error:", err);
            res.status(500).send("Internal Server Error");
        }
        
    }
}
