/*
CSC3916 HW3
File: Server.js
Description: Web API scaffolding for Movie API
 */

//Include .env file
require('dotenv').config();

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.route('/movies')
    .get(authJwtController.isAuthenticated, (req, res) => {
        if (req.query.reviews === 'true') {
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
                    $ifNull: { reviews: [] }
                },
                {
                    $sort: { average_rating: -1 }
                }
            ]).exec((err, movies) => {
                console.log(err)
                var stack = new Error().stack
                console.log(stack)
                if (err) {
                    res.status(500).json({
                        status: 500,
                        message: 'Error retrieving movies with reviews from database'
                    });
                } else {
                    res.status(200).json({
                        status: 200,
                        message: 'GET movies with reviews',
                        headers: req.headers,
                        query: req.query,
                        env: process.env.DB,
                        data: movies,
                    });
                }
            });
        } else {
            Movie.find({}, (err, reviews) => {
                if (err) {
                    res.status(500).json({
                        status: 500,
                        message: 'Error retrieving reviews from database'
                    });
                } else {
                    res.status(200).json({
                        status: 200,
                        message: 'GET reviews',
                        headers: req.headers,
                        query: req.query,
                        env: process.env.DB,
                        data: reviews,
                    });
                }
            });
        }
    })  

    .post(authJwtController.isAuthenticated, (req, res) => {
        // Check if all required fields are present in the request body
        if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors || req.body.actors.length !== 3) {
            res.status(400).json({success: false, msg: 'Please include title, releaseDate, genre, and three actors in request body.'})
        } else {
            // Create a new movie object with the provided fields
            const newMovie = new Movie({
                title: req.body.title,
                releaseDate: req.body.releaseDate,
                genre: req.body.genre,
                actors: [
                    {
                        actorName: req.body.actors[0].actorName,
                        characterName: req.body.actors[0].characterName,
                    },
                    {
                        actorName: req.body.actors[1].actorName,
                        characterName: req.body.actors[1].characterName,
                    },
                    {
                        actorName: req.body.actors[2].actorName,
                        characterName: req.body.actors[2].characterName,
                    },
                ],
            });
    
            // Save the new movie to the database
            newMovie.save((err, savedMovie) => {
                if (err) {
                    res.status(500).json({success: false, msg: 'Failed to save movie to database.'});
                } else {
                    // Send a response with the saved movie data
                    res.status(200).json({
                        status: 200,
                        message: 'movie saved',
                        headers: req.headers,
                        query: req.query,
                        env: process.env.DB,
                        data: savedMovie.toObject,
                    });
                }
            });
        }
    })
    
    
    .put(authJwtController.isAuthenticated, (req, res) => {
        const {title } = req.params;
        const updatedMovie = req.body;
        //Movie.findOneAndUpdate({ 'title': title }, updatedMovie, { new: true }, (err, movies) => {
        Movie.findOneAndUpdate({ title: { $regex: new RegExp(title, "i") } }, updatedMovie, { new: true }, (err, movies) => {          
          //console.log('movies:', movies);
          if (err) {
            res.status(500).json({
              status: 500,
              message: 'Error updating movie in database'
            });
          } else if (!movies) {
            res.status(404).json({
              status: 404,
              message: 'Movie not found'
            });
          } else {
            res.status(200).json({
              status: 200,
              message: 'Movie updated',
              headers: req.headers,
              query: req.query,
              env: process.env.DB,
              data: movies,
            });
            //console.log('updatedMovie: ', updatedMovie);
          }
        });
      })
      
      .delete(authJwtController.isAuthenticated, (req, res) => {
        const { title } = req.params;
        Movie.findOneAndDelete({ 'title': title }, (err, movies) => {
          if (err) {
            res.status(500).json({
              status: 500,
              message: 'Error deleting movie from database'
            });
          } else if (!movies) {
            res.status(404).json({
              status: 404,
              message: 'Movie not found'
            });
          } else {
            res.status(200).json({
              status: 200,
              message: 'Movie deleted',
              headers: req.headers,
              query: req.query,
              env: process.env.DB,
              data: movies,
            });
          }
        });
      })

router.route('/reviews')
    .get(authJwtController.isAuthenticated,(req, res) => {
        Review.find({}, (err, reviews) => {
        if (err) {
            res.status(500).json({
            status: 500,
            message: 'Error retrieving movies from database'
            });
        } else {
            res.status(200).json({
            status: 200,
            message: 'GET reviews',
            headers: req.headers,
            query: req.query,
            env: process.env.DB,
            data: reviews,
            });
        }
        });
    }) 
    .post(authJwtController.isAuthenticated, (req, res) => {
        // Check if all required fields are present in the request body
        if (!req.body.movieId || !req.body.review || !req.body.rating) {
            res.status(400).json({success: false, msg: 'Please include movieId, review, and rating in request body.'})
        } else {
            // Create a new review object with the provided fields
            const newReview = new Review({
                movie_id: req.body.movieId,
                name: req.user.username,
                review: req.body.review,
                rating: req.body.rating
            });
    
            // Save the new review to the database
            newReview.save((err, savedReview) => {
                if (err) {
                    res.status(500).json({success: false, msg: 'Failed to save review to database.'});
                } else {
                    // Send a response with the saved review data
                    res.status(200).json({
                        status: 200,
                        message: 'Review created!',
                        headers: req.headers,
                        query: req.query,
                        env: process.env.DB,
                        data: savedReview.toObject(),
                    });
                }
            });
        }
    });


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


