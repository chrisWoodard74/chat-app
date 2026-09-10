import User from "../models/User.js";
import jwt from "jsonwebtoken";

// MiddleWare to protect routes
export const protectRoute = async (req,res,next) => {
    try {
        const token = req.headers.token;
        if (!token) {
            return res.status(401).json({success:false, message:"Not authorized"});
        }

        const decoded =  await jwt.verify(token,process.env.JWT_SECRET)

        const user = await User.findById(decoded.userId).select("-password");
        if(!user) return res.json({success:false,message:"User not found"});

        req.user = user;
        next();
    } catch (error) {
        console.log(error.message);
        res.status(401).json({success:false,message:error.message});
    }
}