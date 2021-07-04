//This is the database for now with functions to add, remove, get and get users in a room
//users is a list that stores the information of the user: id, name, room

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var waitingSchema = new Schema({
    email: {type:String , unique: true},
    hobby: {type:String},
    match_person: {type:String},
    percent: {type: Number, min:0,max:100},
    roomId: {type:String,  sparse: true}

});

var waitingList = mongoose.model('waitinglist', waitingSchema);
module.exports = waitingList

