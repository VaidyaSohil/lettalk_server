var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ratingSchema = new Schema({
    email: {type: String, required: true},
    comment: {type: String},
    rating: {type: Number, min:0,max:5, required: true},
    author:  {type: String,  required: true}
});

var RatingSchema = mongoose.model('rating', ratingSchema);
module.exports = RatingSchema
