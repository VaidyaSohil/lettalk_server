//USED NODEMON TO AUTO START THE INDEX.JS WHENEVER ANY CHANGES OCCUR (added nodemon in package.json)
const express = require('express'); //initialize express
const app = express();  //initialize express
const bodyParser = require('body-parser');
const cors = require('cors');
const server = require('http').createServer(app);
const io = require('socket.io')(server);  //instance of socketio and pass in server to make this socketio server working
const router = express.Router()
const mongoose = require('mongoose');
const User = require('./db/userSchema')
const Room = require('./db/roomSchema')
require('dotenv').config()
var uniqid = require('uniqid');


mongoose.connect(`mongodb+srv://${process.env.USER_NAME_DB}:${process.env.PASSWORD_DB}@cluster0-lszdj.mongodb.net/test?retryWrites=true&w=majority`)
var db = mongoose.connection;

app.use(bodyParser.json()); // To deserialize body from request as json
app.use(bodyParser.urlencoded({ extended: false  })); // To deserialize body from request
app.use(cors());  //using the cors for cross origin support while deploying online


app.use('/',router) //using the router page through express


const {addUser, removeUser, getUser, getUserInRoom} = require('./db/user');


router.get('/userProfile',function(req, res){
    console.log(req.query.email)

    User.findOne({email:req.query.email},function(err,obj) {
        if(err) {console.log(err)
            return res.status(400).send({success: false, msg: "Bad request"})}
        else if(obj){
            console.log(obj.userProfile)
            return res.status(200).send({success: true, msg: obj.userProfile})
        }
        else{
            return res.status(200).send({success: false, msg: "No result"})
        }
    })

})

router.post('/userProfile',function(req, res){

    let USER_PROFILE = {
            alias: req.body.alias,
            age: req.body.age ,
            hobby: req.body.hobby ,
            interest: req.body.interest,
            gender: req.body.gender,
            picture: req.body.picture
     }

     console.log(USER_PROFILE)
    //Looking for that email
    User.findOne({email:req.body.email},function(err,obj) {
        if (err) {
            console.log(err)
            res.status(400).send({success: false, msg: "Error"})
        }
        else if (obj) {
            //Modify it only
            console.log("It here")
            User.findOneAndUpdate({email: req.body.email}, {userProfile: USER_PROFILE},{new: true},function(err,obj){
                if(err) console.log(err)
            })
            res.status(200).send({success: true, msg: req.body.email + " is modified to our database"})
        } else {
            console.log("New user")
            console.log(req.body.email)
            var user = new User({email: req.body.email, userProfile: USER_PROFILE})
            user.save(function (err, obj) {
                if (err) {
                    console.error(err);
                    res.status(400).send({success: false, msg: "Error"})
                }
                else if(obj){
                    res.status(200).send({success: true, msg: req.body.email + " is added to our database"})
                }
                else{
                    res.status(200).send({success: false, msg: req.body.email + "can't save"})
                }
            })
        }
    })

})



function matchPeople(name) {
    return new Promise(function cb(resolve,reject)  {


            //Look for a room, check the first one, there is no one , create a room Id and push first person in
            Room.findOne({},function(err,obj){
                if(err) console.log(err)
                else if(obj){
                    if(obj.person.length <= 2) {
                        let userName = obj.person
                        console.log(typeof (userName))
                        console.log(userName)
                        userName = userName.concat([name])
                        console.log(userName)
                        Room.findOneAndUpdate({roomId:obj.roomId},function(err,obj){
                            if(err) console.log(err)
                            if(obj) console.log(obj)
                            else{
                                console.log("Nothing populate here")
                            }
                        })
                        resolve(obj.roomId)
                    }
                }
                else {
                    //Create a room and push this room in
                    let roomId = uniqid()
                    console.log(roomId)
                    let userName = [name]
                    userName.push()
                    console.log("get to here")
                    let room = new Room({roomId:roomId,person:userName})
                    room.save()
                    resolve(roomId)
                }
            })

    }
    )
}
router.get('/checkAvailable',function(req,res){
    console.log(req.query)
    Room.findOne({roomId:req.query.roomId},function(err,obj) {
            if(err) {
                res.status(400).send({success:false,msg:"Bad requests"})
                console.log(err)
            }
            if(obj){
                if(obj.person.length >= 2) {
                    res.status(200).send({success: true})
                }
            }
            else{
                res.status(200).send({success:false})
            }

    })

})
router.get('/room',async function(req,res){
    const result = await matchPeople(req.query.username)
    console.log(result)
    res.status(200).send({success:true,msg: result})
})

router.delete('/room',function(req,res){


})




io.on('connection', (socket)=>{
    //console.log('We have a new connection!!');

    socket.on('join', ({name, room}, callback)=>{
        console.log(name,room)
        //error handle function callback in Chat.js (socket.emit)
        const {error, user} = addUser({id: socket.id, name, room});//since addUser only return 2 things (error, user) //addUser takes an object with 3 inputs

        if(error) return callback(error);   //if in case of error (ie. username is already taken, then callback that error which is defined in userSchema.js -> addUser function)

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



var PORT = process.env.PORT || 5000;  //use the process.env.PORT for later deployment or currently use port 5000 on local

server.listen(PORT, ()=> console.log(`Server has started on port ${PORT}`));
