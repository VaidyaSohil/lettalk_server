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
const Rating = require('./db/ratingSchema')
const authJwtController = require('./auth_jwt')
const jwt = require('jsonwebtoken');
require('dotenv').config()
var uniqid = require('uniqid');


mongoose.connect(`mongodb+srv://${process.env.USER_NAME_DB}:${process.env.PASSWORD_DB}@cluster0-lszdj.mongodb.net/test?retryWrites=true&w=majority`)
var db = mongoose.connection;

app.use(bodyParser.json()); // To deserialize body from request as json
app.use(bodyParser.urlencoded({ extended: false  })); // To deserialize body from request
app.use(cors());  //using the cors for cross origin support while deploying online


app.use('/',router) //using the router page through express


const {addUser, getUser, getUserInRoom, removeUser} = require('./db/user');




router.post('/login',function (req,res){

    if(typeof req.body.email == "undefined"|| typeof req.body.password == "undefined" ){
        return res.status(401).send({success: false, msg: 'Please input username or passwpord'});
    }
    var password = req.body.password
    User.findOne({email: req.body.email,password: password},function(err,result){

        if (err) res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});

        if(!result) res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
        else {
            var userToken = {id: result._id, email: result.email, name: result.name}
            var token = jwt.sign(userToken, process.env.SECRET_KEY);
            res.status(200).send({success: true, token:"jwt " +token, name:result.name, email: result.email, alias: result.userProfile.alias})
        }

    })
})

router.get('/checkValidEmail',function(req,res) {
    User.findOne({email: req.query.email}, function (err, obj) {
        if (err) {
            console.log(err)
            res.status(400).send({success: false, msg: "Error"})
        } else if (obj) {
            res.status(200).send({success: false, msg: req.query.email + "Sorry, this user already exists"})
        } else {
            res.status(200).send({success: true})
        }
    })
})
router.post('/register',function(req,res){
    //req.body.email, name,password,alias,age,hobby
    //Looking to see if email already in database
    console.log(req.body)
    if(typeof req.body.email === "undefined" || typeof req.body.password === "undefined" || typeof  req.body.name === "undefined"){
        res.status(400).send({success: false, msg: "Error"})
    }
    else {
        let USER_PROFILE = {
            alias: req.body.alias,
            age: req.body.age,
            hobby: req.body.hobby,
            gender: req.body.gender,
            picture: req.body.picture
        }


        User.findOne({email: req.body.email}, function (err, obj) {
            if (err) {
                console.log(err)
                res.status(400).send({success: false, msg: "Error"})
            } else if (obj) {
                res.status(200).send({success: false, msg: req.body.email + "Sorry, this user already exists"})
            } else {

                var user = new User({email: req.body.email, password: req.body.password, name: req.body.name, userProfile: USER_PROFILE})
                user.save(function (err, obj) {
                    if (err) {
                        console.error(err);
                        res.status(400).send({success: false, msg: "Error"})
                    } else if (obj) {
                        res.status(200).send({success: true, msg: req.body.email + " is added to our database"})
                    } else {
                        res.status(200).send({success: false, msg: req.body.email + "can't save"})
                    }
                })
            }
        })
    }
})

router.route('/userProfile').get(authJwtController.isAuthenticated,function(req, res){

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



router.route('/rating').get(authJwtController.isAuthenticated , function(req,res) {
    if(typeof req.query.email === "undefined"){
        return res.status(400).send({success: false});
    }
    else{
        User.aggregate([
            { $match : { email :   req.query.email} },
            { $lookup:
                    {
                        localField: "email",
                        from: "ratings",
                        foreignField: "email",
                        as: "comment"
                    }
            }
        ],function(err,result) {

            let count = 0
            if(result.length === 0){
                res.status(200).send({success: true, results: [], rating: 0})
            }
            else if(typeof result[0].comment !== "undefined") {
                for (let i = 0; i < result[0].comment.length; i++) {
                    count += parseInt(result[0].comment[i].rating, 10)
                }
                if (result[0].comment.length > 0)
                    count = count / result[0].comment.length
                res.status(200).send({success: true, results: result[0], rating: count})
            }
            else{
                res.status(200).send({success: true, results: [], rating: 0})
            }

        })
    }
})


router.route('/rating').post(authJwtController.isAuthenticated , function(req,res){

    if(typeof req.body.match_person === "undefined"|| typeof req.body.rating === "undefined" ){
        return res.status(400).send({success: false});
    }
    else{
        User.findOne({email: req.body.match_person},function(err,result) {
            if(err) {
                console.log(err)
                return res.status(500).send({success: false});
            }
            else if(result){
                let rating = new Rating({
                    email: req.body.match_person,
                    comment: req.body.comment,
                    rating: req.body.rating,
                    author: req.body.author
                })
                rating.save(function(err,result){
                    if(err){
                        console.log(err)
                        return res.status(500).send({success: false});
                    }
                    else{
                        return res.status(200).send({success: true});
                    }
                })
            }
            else{
                return res.status(400).send({success: false});
            }
        })
    }
})



router.route('/userProfile').post(authJwtController.isAuthenticated,function(req, res){

    let USER_PROFILE = {
            alias: req.body.alias,
            age: req.body.age ,
            hobby: req.body.hobby,
            interest: req.body.interest,
            gender: req.body.gender,
            picture: req.body.picture
     }

     console.log(USER_PROFILE)
    if(req.body.email === null){
        res.status(400).send({success: false, msg: "Bad request"})
    }
    else {
        //Looking for that email
        User.findOne({email: req.body.email}, function (err, obj) {
            if (err) {
                console.log(err)
                res.status(400).send({success: false, msg: "Error"})
            } else if (obj) {
                //Modify it only
                console.log("It here")
                User.findOneAndUpdate({email: req.body.email}, {userProfile: USER_PROFILE}, {new: true}, function (err, obj) {
                    if (err) console.log(err)
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
                    } else if (obj) {
                        res.status(200).send({success: true, msg: req.body.email + " is added to our database"})
                    } else {
                        res.status(200).send({success: false, msg: req.body.email + "can't save"})
                    }
                })
            }
        })
    }
})

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
                if(result === null){
                    return ""
                }
                else if(result.roomId !== null){
                    waitingSchema.findOneAndUpdate({email:myinfo.email},{roomId:result.roomId},function(err){
                        if(err) return console.log(err)
                    })
                    return result
                }
            }
        })


        return ""
}

router.route('/room').get(authJwtController.isAuthenticated, function(req,res){
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
                        let match_person = ""
                        docs.forEach(function (waiting) {
                            if (waiting.email == req.query.email) {
                                if (waiting.roomId !== null) {
                                    checkRoom = waiting.roomId
                                    percent   = waiting.percent
                                    match_person = waiting.match_person
                                }
                            }
                        })

                        if (checkRoom) {
                            res.status(200).send({success: true, msg: checkRoom, percent: percent, match_person: match_person})
                        } else {
                            let result = waitingList(docs, req.query)

                            if (result != "") {
                                res.status(200).send({success: true, msg: result.roomId,percent:result.percent, match_person: result.match_person})
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



router.route('/room').delete(authJwtController.isAuthenticated,function(req,res){
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
