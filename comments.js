// Create web server
// Import modules
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { randomBytes } = require('crypto');
const axios = require('axios');

// Create a web server
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Create a comments object
const commentsByPostId = {};

// Create a route for getting comments for a post
app.get('/posts/:id/comments', (req, res) => {
  // Get comments for post
  res.send(commentsByPostId[req.params.id] || []);
});

// Create a route for posting comments for a post
app.post('/posts/:id/comments', async (req, res) => {
  // Create a comment id
  const commentId = randomBytes(4).toString('hex');

  // Get the comment content
  const { content } = req.body;

  // Get the comments for post
  const comments = commentsByPostId[req.params.id] || [];

  // Add new comment
  comments.push({ id: commentId, content, status: 'pending' });

  // Update comments for post
  commentsByPostId[req.params.id] = comments;

  // Send event to event-bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending'
    }
  });

  // Send response
  res.status(201).send(comments);
});

// Create a route for receiving events
app.post('/events', async (req, res) => {
  // Get event
  const { type, data } = req.body;

  // Check event type
  if (type === 'CommentModerated') {
    // Get comment for post
    const comments = commentsByPostId[data.postId];

    // Get comment
    const comment = comments.find(comment => comment.id === data.id);

    // Update comment status
    comment.status = data.status;

    // Send event to event-bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data
    });
  }

  // Send response
  res.send({});
});

// Listen on port
app.listen