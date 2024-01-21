const User = require('../models/userModel');
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");


//resetPasswordToken
exports.resetPasswordToken = async (req, res) => {
    try {
        //get email from req body
        const email = req.body.email;
        //check user for this email , email validation
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Your Email is not registered with us",
            })
        }
        //generate token
        const token = crypto.randomBytes(20).toString("hex");
        //update user by adding token and expiration time
        const updatedDetails = await User.findOneAndUpdate(
            { email: email },
            {
                token: token,
                resetPasswordExpires: Date.now() + 5 * 60 * 1000,
            },
            { new: true }
        )
        //create url
        const url = `http://localhost:5173/update-password/${token}`;
        //send mail containing the url
        await mailSender(email, "Password Reset Link", `Password Reset Link: ${url}`);
        // return response 
        return res.status(200).json({
            success: true,
            message: "Email Sent successfully, please check email and change pwd",
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while sending reset pwd mail",
        })
    }
}

//resetPassword
exports.resetPassword = async (req, res) => {
    try {
        //data fetch
        const { password, confirmPassword, token } = req.body;
        //validation
        if (password !== confirmPassword) {
            return res.status(401).json({
                success: false,
                message: "Password not matching",
            });
        }
        //get userDetails from DB using token
        const userDetails = await User.findOne({ token: token });
        //if no entry - invalid token
        if (!userDetails) {
            return res.status(401).json({
                success: false,
                message: "Token is invalid",
            });
        }
        //token time check
        if (userDetails.resetPasswordExpires < Date.now()) {
            return res.status(401).json({
                success: false,
                message: "Token is expired, please regenerate your token",
            })
        }
        //hash pwd
        const hashedPassword = await bcrypt.hash(password, 10);

        //password update
        await User.findOneAndUpdate({ token: token }, { password: hashedPassword }, { new: true });
        // return response 
        return res.status(200).json({
            success: true,
            message: "Password Reset successful",
        })
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while sending reset pwd mail",
        })
    }
}