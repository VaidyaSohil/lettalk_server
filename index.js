//USED NODEMON TO AUTO START THE INDEX.JS WHENEVER ANY CHANGES OCCUR (added nodemon in package.json)
const express = require('express'); //initialize express
const app = express();  //initialize express
const bodyParser = require('body-parser');
const cors = require('cors');
const server = require('http').createServer(app);
const io = require('socket.io')(server);  //instance of socketio and pass in server to make this socketio server working
const hostname = '127.0.0.1';
const router = express.Router()

app.use(router);    //using the router page through express
app.use(bodyParser.json()); // To deserialize body from request as json
app.use(bodyParser.urlencoded({ extended: false })); // To deserialize body from request
app.use(cors());  //using the cors for cross origin support while deploying online

const {addUser, removeUser, getUser, getUserInRoom} = require('./db/users.js');

const PORT = process.env.PORT || 5000;  //use the process.env.PORT for later deployment or currently use port 5000 on local




io.on('connection', (socket)=>{
    //console.log('We have a new connection!!');

    socket.on('join', ({name, room}, callback)=>{   //error handle function callback in Chat.js (socket.emit)
        const {error, user} = addUser({id: socket.id, name, room});//since addUser only return 2 things (error, user) //addUser takes an object with 3 inputs

        if(error) return callback(error);   //if in case of error (ie. username is already taken, then callback that error which is defined in users.js -> addUser function)

        //Else (when there's no error) do the following: Join the user in the room and Display message on the chat box

        socket.join(user.room); //joins a new user in that room

        //since admin is sending message to the user we are using "emit" //emitting part is happening in the front end
        socket.emit('message', {user: 'admin', text: `${user.name}, welcome to the room ${user.room}`});
        socket.broadcast.to(user.room).emit('message', {user: 'admin', text: `${user.name}, has joined!`}); //broadcast is used when you want to display message to everyone else beside the user who currently joined

        io.to(user.room).emit('roomData', {room: user.room, users: getUserInRoom(user.room)})   //get the users that are connected in a specific room

        callback(); //callback at front end gets called every time but if no errors, simply not going to pass the error
    })

    //since user is sending back to the server, the server is expecting, thus we are using "on"
    //socket.on takes 2 params (key message [needs to save this key message in backend as frontend sends with this key message], function)
    socket.on('sendMessage', (message, callback) => {   //arrow function takes 2 params, message and callback when an event is emitted
        const user = getUser(socket.id);    //get user who sent that message by using the socket.id of that user

        io.to(user.room).emit('message', {user: user.name, text: message}); //display to the front end

        callback(); //do something after the message is sent in the front end
    });

    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id); //remove the user if disconnect
        if(user){   //if user got disconnected, then emit a message on the front end (the specific room)
            io.to(user.room).emit('message', {user:'admin', text: `${user.name} has left`});
            io.to(user.room).emit('roomData', {room: user.room, users: getUserInRoom(user.room)});  //display to the front end about the current active users
        }
        //console.log('User left!!');
    })
});



server.listen(PORT,hostname, ()=> console.log(`Server has started on port ${PORT}`));
