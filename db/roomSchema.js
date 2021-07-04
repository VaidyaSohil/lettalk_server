//This is the database for now with functions to add, remove, get and get users in a room
//users is a list that stores the information of the user: id, name, room

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var roomSchema = new Schema({
    roomId: {type:String},
    person: []
});

var Room = mongoose.model('rooms', roomSchema);
module.exports = Room

