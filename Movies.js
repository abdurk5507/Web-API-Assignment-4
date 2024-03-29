var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect(process.env.DB);

// Movie schema
var MovieSchema = new Schema({
  title: {
    type: String,
    required: true,
    index: true
  },
  releaseDate: String,
  genre: {
    type: String,
    enum: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Thriller', 'Western', 'Science Fiction']
  },
  actors: {
    type: [{
      actorName: {
        type: String,
        required: true
      },
      characterName: {
        type: String,
        required: true
      }
    }],
    validate: [actorsLimit, '{PATH} exceeds the limit of 3']
  },
  imageUrl: {
    type: String, 
    required: false
  }
});

// Custom validator function for actors array
function actorsLimit(val) {
  return val.length <= 3;
}

// return the model
module.exports = mongoose.model('Movie', MovieSchema);
