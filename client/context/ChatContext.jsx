import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";


export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {

    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});
    const selectedUserRef = useRef(selectedUser);

    const {socket, axios } = useContext(AuthContext)

    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);


    // function to get all users for sidebar

    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users)
                setUnseenMessages(data.unseenMessages)

            }
        } catch (error) {
            toast.error(error.message); 
        }
    }

// function to get messages for selected user
const getMessages = async (userId) => {
    try {
       const { data } = await axios.get(`/api/messages/${userId}`);
        if (data.success && selectedUserRef.current?._id === userId){
            setMessages(data.messages)
        }
    } catch (error) {
         toast.error(error.message);
    }
}

// function to send message to a selected user
const sendMessage = async (messageData) => {
    try {
        const {data} = await axios.post(`/api/messages/send/${selectedUser._id}`,messageData);
        if (data.success){
            setMessages((prevMessages)=>[...prevMessages, data.newMessage])
            return true;
        }else{
            toast.error(data.message);
            return false;
        }
    } catch (error) {
        toast.error(error.message);
        return false;
    }
}

// function to subscribe to messages for selected user
const subscribedToMessages = async () => {
    if(!socket) return;

    socket.on("newMessage", async (newMessage)=>{
        if(selectedUser && newMessage.senderId === selectedUser._id){
            newMessage.seen = true;
            setMessages((prevMessages)=>[...prevMessages, newMessage]);
            try {
                await axios.put(`/api/messages/mark/${newMessage._id}`);
            } catch (error) {
                toast.error(error.message);
            }
        }else{
            setUnseenMessages((prevUnseenMessages)=>({
                ...prevUnseenMessages, [newMessage.senderId] : 
                prevUnseenMessages[newMessage.senderId] ? 
                prevUnseenMessages[newMessage.senderId] + 1 : 1
            }))
        }
    })
}

// function to unsubscribe from messages
const unsubscribeFromMessages = () => {
    if(socket) socket.off("newMessage");
}

useEffect(()=>{
    subscribedToMessages();
    return ()=> unsubscribeFromMessages();
},[socket, selectedUser])

    const value = {
        messages, users, selectedUser, getUsers, getMessages, sendMessage, setSelectedUser,
        unseenMessages, setUnseenMessages, 
    }

    return (<ChatContext.Provider value={value}>
        { children }
    </ChatContext.Provider>)
}