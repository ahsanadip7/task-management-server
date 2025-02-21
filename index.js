const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:5176'],
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
run();

// Task Management routes

// Get All Tasks (Sorted by Position)
app.get('/tasks', async (req, res) => {
  try {
    const tasksCollection = client.db('taskManagement').collection('tasks');
    const tasks = await tasksCollection.find().sort({ position: 1 }).toArray();
    res.json(tasks);
  } catch (err) {
    res.status(400).json({ message: 'Error fetching tasks', error: err.message });
  }
});

// Add Task
app.post('/tasks', async (req, res) => {
  const { title, description, category } = req.body;

  if (!title || !description || !category) {
    return res.status(400).json({ message: 'All fields (title, description, category) are required' });
  }

  const timestamp = new Date();
  const tasksCollection = client.db('taskManagement').collection('tasks');

  // Get current max position in category
  const lastTask = await tasksCollection.find({ category }).sort({ position: -1 }).limit(1).toArray();
  const newPosition = lastTask.length > 0 ? lastTask[0].position + 1 : 0;

  const newTask = { title, description, category, timestamp, position: newPosition };

  try {
    const result = await tasksCollection.insertOne(newTask);
    res.status(201).json({ _id: result.insertedId, ...newTask });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update Task Order in Same List
app.patch('/tasks/order', async (req, res) => {
  const { category, tasks } = req.body; // Array of task IDs in new order
  const tasksCollection = client.db('taskManagement').collection('tasks');

  const bulkOps = tasks.map((taskId, index) => ({
    updateOne: {
      filter: { _id: new ObjectId(taskId) },
      update: { $set: { position: index } } // Updating the position based on new order
    }
  }));

  try {
    await tasksCollection.bulkWrite(bulkOps);
    res.json({ message: "Task positions updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task positions" });
  }
});

// Move Task to Another Category and Update Position
app.patch("/tasks/move", async (req, res) => {
  const { taskId, category, tasks } = req.body;

  try {
    const tasksCollection = client.db('taskManagement').collection('tasks');

    // Update category of moved task
    await tasksCollection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: { category } }
    );

    // Update positions in the destination category
    const bulkOps = tasks.map(({ _id, position }) => ({
      updateOne: {
        filter: { _id: new ObjectId(_id) },
        update: { $set: { position } }
      }
    }));

    await tasksCollection.bulkWrite(bulkOps);
    res.json({ message: "Task moved and positions updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to move task" });
  }
});

// Update Task Details (Title, Description, Category, Position)
app.patch('/tasks/:id', async (req, res) => {
  const { title, description, category, position } = req.body;
  const taskId = req.params.id;

  const updatedFields = {};
  if (title) updatedFields.title = title;
  if (description) updatedFields.description = description;
  if (category) updatedFields.category = category;
  if (position !== undefined) updatedFields.position = position;

  if (Object.keys(updatedFields).length === 0) {
    return res.status(400).json({ message: 'At least one field must be provided to update.' });
  }

  try {
    const tasksCollection = client.db('taskManagement').collection('tasks');

    if (!ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }

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

app.delete('/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
  
    try {
      // Assuming you've already connected to the MongoDB client
      const tasksCollection = client.db('taskManagement').collection('tasks');
      
      // Ensure the taskId is a valid ObjectId
      if (!ObjectId.isValid(taskId)) {
        return res.status(400).json({ message: 'Invalid task ID' });
      }
  
      // Delete the task
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });
  
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Task not found' });
      }
  
      res.json({ message: 'Task deleted successfully' });
    } catch (err) {
      // If something goes wrong with the database operation
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
