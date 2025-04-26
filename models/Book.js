const mongoose = require('mongoose');
const path = require('path');

const coverImageBasePath = 'public/images';

const bookSchema = new mongoose.Schema(
  {
    isbn: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
    },
    publish_year: {
      type: String,
      required: true,
      minlength: 3,
      maxlength: 4,
    },
    page_count: {
      type: Number,
      required: true,
    },
    genre: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
    },
    cover_image: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Virtual method for cover image path
bookSchema.virtual('coverImagePath').get(function () {
  if (this.cover_image !== null) {
    return path.join('/', coverImageBasePath, this.cover_image);
  }
});

// Sorting Books by Title (Using Sorting Algorithm)
bookSchema.statics.sortBooksByTitle = function () {
  return this.find().sort({ title: 1 });  // Ascending order by title
};

// Sorting Books by Publish Year (Using Sorting Algorithm)
bookSchema.statics.sortBooksByPublishYear = function () {
  return this.find().sort({ publish_year: -1 });  // Descending order by publish year
};

// Searching Books by ISBN (Linear Search)
bookSchema.statics.searchBookByISBN = function (isbn) {
  return this.findOne({ isbn: isbn });
};

// Searching Books by Author (Linear Search)
bookSchema.statics.searchBooksByAuthor = function (author) {
  return this.find({ author: new RegExp(author, 'i') });  // Case-insensitive search for author
};

// Filtering Books by Genre and Stock (Multi-Criteria Filtering)
bookSchema.statics.filterBooks = function (genre, minStock) {
  return this.find({
    genre: new RegExp(genre, 'i'),  // Case-insensitive genre search
    stock: { $gte: minStock },  // Minimum stock count filtering
  });
};

// Binary Search for a Book in Sorted Array (Example)
bookSchema.statics.binarySearchBooksByISBN = function (isbn) {
  return this.find({ isbn }).sort({ isbn: 1 });  // Assume data is sorted by ISBN
  // Implement a more advanced binary search algorithm if needed, as per requirements.
};

// Linear Search for All Books by Title (for demonstration)
bookSchema.statics.linearSearchBooksByTitle = function (title) {
  return this.find({ title: new RegExp(title, 'i') }); // Case-insensitive search for title
};

// Example of Recursive Search (Binary Search Approach)
// This is more of a conceptual example since MongoDB handles search natively with indexes
bookSchema.statics.recursiveBinarySearch = function (arr, target, low, high) {
  if (low > high) return null;
  let mid = Math.floor((low + high) / 2);
  if (arr[mid].isbn === target) return arr[mid];
  if (arr[mid].isbn > target) return this.recursiveBinarySearch(arr, target, low, mid - 1);
  return this.recursiveBinarySearch(arr, target, mid + 1, high);
};

module.exports = mongoose.model('book', bookSchema);
