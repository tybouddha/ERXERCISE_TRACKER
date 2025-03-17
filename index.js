const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/exercise-tracker", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Schemas and Models
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
});

const User = mongoose.model("User", userSchema);

const exerciseSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date },
});

const Exercise = mongoose.model("Exercise", exerciseSchema);

// Routes
app.post("/api/users", async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(400).send("Username already exists");
  }
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
    });

    await exercise.save();

    const response = {
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id,
    };

    res.json(response);
  } catch (err) {
    res.status(400).send("Error saving exercise");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    let filter = { userId: user._id };
    if (from) filter.date = { $gte: new Date(from) };
    if (to) filter.date = { ...filter.date, $lte: new Date(to) };

    const exercises = await Exercise.find(filter).limit(+limit || 500);

    const log = exercises.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    res.status(400).send("Error retrieving logs");
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
