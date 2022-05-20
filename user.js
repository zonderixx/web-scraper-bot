const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const User = new Schema({
    id: {
      type: String
    },
    lastURL: {
      type: String
    },
    website: {
      type: String
    }
}, { timestamps: true }) 

module.exports = mongoose.model('User', User);