const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:5176',
  ],
  credentials: true,
}));
app.use(express.json());

// MongoDB URI and Client Initialization
const uri = process.env.MONGODB_URI || "mongodb+srv://task-management:3cx4VbcZq13vZdNN@cluster0.u9byz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Test MongoDB connection once at app start
async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1); // Exit app if DB connection fails
  }
}

// Call the `run` function to connect to the database
run();

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

    res.status(201).json({ _id: result.insertedId, ...newTask });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update Task
// Update Task using PATCH (partial update)
app.patch('/tasks/:id', async (req, res) => {
    const { title, description, category } = req.body;
    const taskId = req.params.id;
  
    const updatedFields = {};  // Object to store the updated fields
  
    if (title) updatedFields.title = title;
    if (description) updatedFields.description = description;
    if (category) updatedFields.category = category;
  
    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: 'At least one field (title, description, or category) must be provided to update.' });
    }
  
    try {
      const tasksCollection = client.db('taskManagement').collection('tasks');
  
      // Ensure taskId is valid
      if (!ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }
  
      // Update task in the collection
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(taskId) },
        { $set: updatedFields }
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
  res.send('Server is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
