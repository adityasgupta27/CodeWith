const express = require('express');
const app = express();
const http = require('http');
// const path = require('path');
const { Server } = require('socket.io');
// const { JOIN } = require('./src/Actions');
const ACTIONS = require('./src/Actions');

const server = http.createServer(app);
const io = new Server(server);

const userSocketMap = {};
function getAllConnectedClients(roomID)
{
    return Array.from(io.sockets.adapter.rooms.get(roomID) || []).map(
        (socketId) => {
            return {
                socketId,
                username:userSocketMap[socketId],
            };
        }
    );
}

io.on('connection',(socket)=>{
    console.log('socket connected',socket.id);
    socket.on(ACTIONS.JOIN,({roomId,username})=>{
        userSocketMap[socket.id] = username;    // map unique socket ids to their respective users
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        // console.log(clients);
        clients.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED,{
                clients,
                username,
                socketId:socket.id,
            });
        });
    }); 

    socket.on(ACTIONS.CODE_CHANGE, ({roomID,code}) => {
        socket.in(roomID).emit(ACTIONS.CODE_CHANGE, {code});
    });

    socket.on(ACTIONS.SYNC_CODE, ({socketId,code}) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on('disconnecting',() =>{
        const rooms = [...socket.rooms];
        rooms.forEach((roomID) => {
            socket.in(roomID).emit(ACTIONS.DISCONNECTED, {
                socketId:socket.id,
                username: userSocketMap[socket.id],
            });
        });

        delete userSocketMap[socket.id];
        socket.leave();
    });
});


const PORT = process.env.PORT || 5000;
server.listen(PORT,()=>console.log(`listening on port ${PORT}`));