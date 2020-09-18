var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var dotenv = require('dotenv');
var cors = require("cors");

var app = express();
var Schema = mongoose.Schema;
dotenv.config();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

// DB connection
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => console.log("Database Connected"))
    .catch(err => console.log("Database connection error", err))

// Create document Schema
var userSchema = new Schema({
    username: { type: String, required : true },
    exercise:[{
        description: String,
        duration: Number,
        date: String
    }]
})
// create Model
var User = mongoose.model('User', userSchema);

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
    var username = req.body.username;
    // create user in db with username from body
    User.create({username: username}, (err, user) => {
        if(err) return console.log(err);
        res.json({
            username: user.username,
            _id: user._id
        })
    })
});

app.get('/api/exercise/users', (req, res) => {
    // return an array of all users in db 
    User.find({}, (err, users) => {
        if(err) return console.log(err);
        res.json(users)
    })
})

app.post('/api/exercise/add', async function (req, res) {
    var id = req.body.userId;
    var description = req.body.description;
    var duration = req.body.duration;
    var dateH = req.body.date;
    if(dateH == "") {
        var date = Date();
    }else{
        var date = Date(dateH);
    }

    var newExercise = {
        description: description,
        duration: duration,
        date: date
    }

   User.updateOne({_id: id}, {$push: {exercise:newExercise}}, (err) => {
        if(err) return console.log(err)
        User.findById(id, (err, user) => {
            if (err) return console.log(err);
            var lastExerciseExtract = user.exercise.slice(-1)[0];
            res.json({
                _id: user._id,
                username: user.username,
                description: lastExerciseExtract.description,
                duration: lastExerciseExtract.duration,
                date: new Date(lastExerciseExtract.date).toDateString()
            })
        }) 
   })
})

app.get('/api/exercise/log', (req, res) => {
    var id = req.query.userId;
    var from = req.query.from;
    var to = req.query.to;
    var limitH = req.query.limit
    if(typeof limitH == "undefined" || parseInt(limitH, 10) <= 0){
        var limit = 10000;
    }else{
        var limit = parseInt(limitH, 10);
    }

    var aggregateBuilder = function() {
        // "to, from" is undefined
        if(typeof from == "undefined" && typeof to == "undefined"){
            return [
                {
                    $match:{_id: mongoose.Types.ObjectId(id)},
                },
                {$unwind: "$exercise"},
                {$limit: limit},
                {
                    $group: {
                        _id: null,
                        count: {$sum: 1},
                        log: {$push: "$exercise"}
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ]
        }else{
            return [
                {
                    $match:{_id: mongoose.Types.ObjectId(id)},
                },
                {
                    $project: {
                        exercise:{
                            $filter: {
                                input: "$exercise",
                                as: "exerciseList",
                                cond: {$and: [
                                    {$gte:["$$exerciseList.date", new Date(from)]},    
                                    {$lte:["$$exerciseList.date", new Date(to)]}    
                                    ]   
                                }
                            } 
                        }
                    }
                },
                {$unwind: "$exercise"},
                {$limit: limit},
                {
                    $group: {
                        _id: null,
                        count: {$sum: 1},
                        log: {$push: "$exercise"}
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ]
        }
    }
    User.aggregate(aggregateBuilder(), (err, user) => {
        if (err) return console.log(err);
        res.json({
            count: user[0].count,
            log: user[0].log
        })
    })

    // retrieve exercise log of any user with params userId(_id)
    // retrieve part of log by passing optional params of (from , to) = yyyy-mm-dd or limit = int
    // returnu ser obj with array log and count
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
