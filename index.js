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
const waitingSchema= require('./db/waitingSchema')
require('dotenv').config()
var uniqid = require('uniqid');


mongoose.connect(`mongodb+srv://${process.env.USER_NAME_DB}:${process.env.PASSWORD_DB}@cluster0-lszdj.mongodb.net/test?retryWrites=true&w=majority`)
var db = mongoose.connection;

app.use(bodyParser.json()); // To deserialize body from request as json
app.use(bodyParser.urlencoded({ extended: false  })); // To deserialize body from request
app.use(cors());  //using the cors for cross origin support while deploying online


app.use('/',router) //using the router page through express


const {addUser, getUser, getUserInRoom, removeUser} = require('./db/user');


router.get('/userProfile',function(req, res){
    console.log("email here",req.query.email)

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
            hobby: (req.body.hobby).trim() ,
            interest: req.body.interest,
            gender: req.body.gender,
            picture: req.body.picture
     }

     console.log(USER_PROFILE)
    if(req.body.email === null){
        res.status(400).send({success: false, msg: "Bad request"})
    }
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
// [a,b,c,d]
//[b,c,a,d]

function matchAlgo(waiting,myinfo,strangerInfo){
    let count = 0
    let length = 1
    //Loop through hobby array
    //Put my hobby array here
    //Stranger hobby array

    let myHobby = myinfo.hobby.split(",").sort(), strangerHobby = strangerInfo.hobby.split(",").sort()

    if(myHobby.length > strangerHobby.length){
        for(let i = 0 ; i < strangerHobby.length; i++){
            if(myHobby[i].toLowerCase() == strangerHobby[i].toLowerCase()){
                count = count + 1
            }
        }
        length = myHobby.length
    }
    else{
        for(let i = 0 ; i < myHobby.length; i++){
            if(myHobby[i].toLowerCase() == strangerHobby[i].toLowerCase()){
                count = count + 1
            }
        }
        if(strangerHobby.length > 0 )
        length = strangerHobby.length
    }
    let percent = (count * 100/ length )

    if (percent >= 50) {
        let roomId = uniqid()
        //Looking for my name and stranger in waiting list

        waitingSchema.findOneAndUpdate({email:myinfo.email},{match_person:strangerInfo.email,percent: percent,roomId:roomId},function(err){
            if(err) return console.log(err)
        })

        waitingSchema.findOneAndUpdate({email:strangerInfo.email},{match_person:myinfo.email,percent: percent,roomId:roomId},function(err){
            if(err) return console.log(err)
        })
        let result = {roomId:roomId, percent:percent}
        return result
    }
    else
        return null

}
// [{},{},{},{}]
//person is  [{},{}]
function waitingList(waiting,myinfo){
        waiting.forEach(function(docs){
            if(docs.email != myinfo.email && docs.roomId === null){
                let result = matchAlgo(waiting,myinfo,docs)
                if(result.roomId !== null){
                    waitingSchema.findOneAndUpdate({email:myinfo.email},{roomId:result.roomId},function(err){
                        if(err) return console.log(err)
                    })
                    return result
                }
            }
        })


        return ""
}

router.get('/room', function(req,res){
    if(req.query.email === null){
        res.status(200).send({success: false, msg: "No room for you"})
    }
    let waitingInfo = {email:req.query.email,hobby:req.query.hobby,match_person:"",percent:"",roomId:null}

    //Check if this person are no longer in queue.
    //pos = waiting.map(function(e) {return e.email}).indexOf(req.query.email);

    waitingSchema.find({email:req.query.email},function(err,doc){
        if(err) return console.log(err)
        else {
            if (doc.length == 0) {
                let waitingDoc = new waitingSchema({
                    email: req.query.email,
                    hobby: req.query.hobby,
                    match_person: "",
                    percent: "",
                    roomId: null
                })

                waitingDoc.save(function (err) {
                    if (err) return console.log(err)
                    // saved!
                })
                res.status(200).send({success: false, msg: "No room for you"})
            } else {
                let waiting = new Array()
                waitingSchema.find({}, function (err, docs) {
                    if (err) return console.log(err)
                    else {
                        let checkRoom = ""
                        let percent = ""

                        docs.forEach(function (waiting) {
                            if (waiting.email == req.query.email) {
                                if (waiting.roomId !== null) {
                                    checkRoom = waiting.roomId
                                    percent   = waiting.percent
                                }
                            }
                        })

                        if (checkRoom) {
                            res.status(200).send({success: true, msg: checkRoom, percent: percent})
                        } else {
                            let result = waitingList(docs, req.query)

                            if (result != "") {
                                res.status(200).send({success: true, msg: result.roomId,percent:result.percent})
                            } else {
                                res.status(200).send({success: false, msg: "No room for you"})
                            }
                        }
                    }
                })
            }
        }
    })



})



router.delete('/room',function(req,res){
    //Looking for email address for now, but will do token for security
    //Looking if token match this room then delete for both user
    // Say sorry for both user, I'm out of service
    waitingSchema.deleteMany({roomId: req.body.roomId}, function (err){
        if(err) {
            console.log(err)
            res.status(500).send({success: false, msg: "Service unavailable"})
        }
    })
    res.status(200).send({success: true, msg: "Successfully delete room"})
})

//Check if user still active in the room, if one person exit,  return false
router.get('/roomAvailable',function(req,res){

    waitingSchema.findOne({roomId: req.query.roomId},function(err,doc){
        if(err) {
            console.log(err)
            res.status(500).send({success: false, msg: "Service unavailable"})
        }
        else{
            if(!doc){
                res.status(200).send({success: false, msg: "Room is not active"})
            }
            else{
                res.status(200).send({success: true, msg: "Room is active"})
            }
        }

    })
})


router.get('/online',function(req,res){
    waitingSchema.find({},function(err,docs){
        if(err) {
            console.log(err)
            res.status(500).send({success: false, msg: "Service currently unavailable"})
        }
        else{
            //console.log("get people online:",docs.length)
            res.status(200).send({success: true, numberOnline: docs.length})
        }
    })
})


io.on('connection', (socket)=>{
    //console.log('We have a new connection!!');


    socket.on('join', (data) => {
        console.log("name and room",socket.id,data.name,data.room)
        if(typeof (data) !== "undefined") {
            let user = addUser( socket.id,data.name, data.room)
            console.log("User:",user)
            if (typeof (user) !== "undefined") {
                socket.join(user.room); // Subscribe socket to this room
                console.log("Send msg to front end", user.name, user.room)
                socket.emit('message', {user: 'admin', text: `${user.name}, welcome to the room ${user.room}`});
                socket.broadcast.to(user.room).emit('message', {user: 'admin', text: `${user.name}, has joined!`}); //broadcast is used when you want to display message to everyone else beside the user who currently joined

                io.to(user.room).emit('roomData', {room: user.room, users: getUserInRoom(user.room)})   //get the users that are connected in a specific room
            }
        }

    })


    socket.on('sendMessage', (data) => {
        console.log("get message",data)
        if(typeof data !== "undefined") {
            const user = getUser(data.name);    //get user who sent that message by using the socket.id of that user
            console.log("Send message name",user)
            if(typeof user !== "undefined")
                console.log("Send message to front end",data.message)
                io.to(user.room).emit('message', {user: user.name, text: data.message}); //display to the front end

        }
        else{
            //Exception handling here
        }

    });


    socket.on('disconnect', ()=> {
        removeUser(socket.id)
        socket.disconnect()
    })

});



var PORT = process.env.PORT || 5000;  //use the process.env.PORT for later deployment or currently use port 5000 on local

server.listen(PORT, ()=> console.log(`Server has started on port ${PORT}`));
