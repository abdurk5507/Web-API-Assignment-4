var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect(process.env.DB);

// Movie schema
var ReviewSchema = new Schema({
    movie_id: {
        type:mongoose.type.ObjectId, 
        required: true
    },
    name: {
        type:String, 
        required:true
    },
    review: {
        type:String, 
        required:true
    },
    rating: {
        type:Number, 
        min:0, 
        max:5, 
        required:true
    }
});

// return the model
module.exports = mongoose.model('Review', ReviewSchema);

/*
DB.movies.aggregate([
    {
        $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'movieId',
            as: 'reviews'
        }
    },
    {
        $addFields: {
            average_rating: { $avg: '$reviews.rating' }
        }
    },
    {
        $sort: { average_rating: -1 }
    }
])
*/