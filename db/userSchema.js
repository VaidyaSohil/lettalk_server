//This is the database for now with functions to add, remove, get and get users in a room
//users is a list that stores the information of the user: id, name, room

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
    email:  {type: String, unique: true, required: true},
    name: {type: String},
    password: {type: String},
    isOnline: {type:Boolean , default: false},
    lastSeen: {type : Date},
    userProfile:{
        alias: {type: String},
        age: { type:Number},
        hobby: {type: Array},
        gender:{type:String},
        picture: { type:String},
        description: {type: String}
    },
    created: {type: Date}

});

var User = mongoose.model('users', userSchema);
module.exports = User

