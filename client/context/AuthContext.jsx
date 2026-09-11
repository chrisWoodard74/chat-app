import { createContext, useEffect, useState } from "react";
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "");
const socketUrl = (import.meta.env.VITE_SOCKET_URL || backendUrl)?.replace(/\/$/, "");
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({children}) => {
    
   const [token, setToken] = useState(localStorage.getItem("token"));
    const [authUser, setAuthUser] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [socket, setSocket] = useState(null);

    // Check if user is authenticated and if so, set the user data and connect to the socket
    const checkAuth = async () => {
        try {
            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user)
                connectSocket(data.user, token)
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                toast.error(error.message)
            }
        }
    }

    // Login function to handle user authentication and socket connection
    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success){
                setAuthUser(data.userData);
                connectSocket(data.userData, data.token);
                axios.defaults.headers.common["token"] = data.token;
                setToken(data.token);
                localStorage.setItem("token", data.token)
                toast.success(data.message)
            }else {
                toast.error(data.message)
            }
        } catch (error) {
           toast.error(error.message); 
        }
    }
    // Logout function to logout userand socket connection
    const logout = async () => {
        localStorage.removeItem("token");
        setToken(null);
        setAuthUser(null);
        setOnlineUsers([]);
        axios.defaults.headers.common["token"] = null;
        toast.success("Logged out successfully")
        socket?.disconnect();
        setSocket(null);
    }

    // Update profile function to handle user updates
    const updateProfile = async (body) => {
        try {
            const { data } =await axios.put("/api/auth/update-profile", body)
            if(data.success){
                setAuthUser(data.user);
                toast.success("Profile updated successfully")
                return true;
            }
            toast.error(data.message);
            return false;
        } catch (error) {
            toast.error(error.response?.data?.message || error.message);
            return false;
        }
    }

    // Connect socket function to handle socket connection and online users updates
    const connectSocket = (userData, authToken = token) => {
        if (!socketUrl || !userData?._id || socket?.connected) return;
        const newSocket = io(socketUrl, {
            auth: {
                token: authToken,
            },
            autoConnect: false,
        });

        newSocket.on("getOnlineUsers", (userIds)=>{
            setOnlineUsers(userIds)
        })
        newSocket.on("connect_error", (error) => {
            toast.error(`Socket connection failed: ${error.message}`);
        });

        newSocket.on("disconnect", () => {
            setOnlineUsers([]);
        });

        setSocket(newSocket);
        newSocket.connect();
    }

    useEffect(() => () => socket?.disconnect(), [socket]);

    useEffect(()=>{
        if(token){
            axios.defaults.headers.common["token"] = token;
        }
        checkAuth()
    },[])

    const value = {
        axios,
        authUser,
        onlineUsers,
        socket,
        login,
        logout,
        updateProfile
    }


    return (
        <AuthContext.Provider value={value}>
            { children }
        </AuthContext.Provider>
    )
}