const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json());

const uri = "mongodb+srv://task-management:3cx4VbcZq13vZdNN@cluster0.u9byz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Test MongoDB connection
async function run() {
  try {
    await client.connect();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
  }
}

run().catch(console.dir);

// Task Management routes

// Get All Tasks
app.get('/tasks', async (req, res) => {
  try {
    const tasksCollection = client.db('taskManagement').collection('tasks');
    const tasks = await tasksCollection.find().toArray();

    res.json(tasks);
  } catch (err) {
    res.status(400).json({ message: 'Error fetching tasks', error: err.message });
  }
});

// Add User (You mentioned adding a user, here’s an example route)
app.post('/user', async (req, res) => {
  const addUser = req.body;

  try {
    const userCollection = client.db('taskManagement').collection('users');
    const result = await userCollection.insertOne(addUser);
    res.send(result);
  } catch (err) {
    res.status(400).json({ message: 'Error adding user', error: err.message });
  }
});

// Add Task
app.post('/tasks', async (req, res) => {
  const { title, description, category } = req.body;

  // Validate input
  if (!title || !description || !category) {
    return res.status(400).json({ message: 'All fields (title, description, category) are required' });
  }

  const timestamp = new Date();
  const newTask = { title, description, category, timestamp };

  try {
    const tasksCollection = client.db('taskManagement').collection('tasks');
    const result = await tasksCollection.insertOne(newTask);

    res.status(201).json({ _id: result.insertedId, ...newTask }); // Return the created task with its MongoDB ID
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update Task
app.put('/tasks/:id', async (req, res) => {
  const { title, description, category } = req.body;
  const taskId = req.params.id;

  try {
    const tasksCollection = client.db('taskManagement').collection('tasks');
    const result = await tasksCollection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { title, description, category } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Task not found or no changes made' });
    }

    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error updating task', error: err.message });
  }
});

// Delete Task
app.delete('/tasks/:id', async (req, res) => {
  const taskId = req.params.id;

  try {
    const tasksCollection = client.db('taskManagement').collection('tasks');
    const result = await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting task', error: err.message });
  }
});

// Home route to confirm server is running
app.get('/', (req, res) => {
  res.send('Server is peeing');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
