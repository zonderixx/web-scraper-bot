const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron')
const mongoose = require('mongoose');
const TelegramApi = require('node-telegram-bot-api');
const User = require('./user');

const db_url = process.env.DB_URL;
const token = process.env.TOKEN;
const bot = new TelegramApi(token, {polling: true});

// const url = 'https://www.theguardian.com/international'

const connect = mongoose.connect(db_url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

connect
.then(() => {
  console.log('Connected succesfully to the server!');
})
.catch((err) => {
  console.log(err);
});

bot.setMyCommands([
  {command: '/start', description: 'Send a link'},
])

const downloadPosts = async (link, user) => {
  if (!link) {
    return;
  }
  try {
    const { data } = await axios(link);
    const $ = await cheerio.load(data);
    const arr = [];

    await $(".fc-item__title").each(function () {
      const title = $(this).text().trim();
      const url = $(this).find("a").attr("href");
      arr.push({
        title,
        url,
      });
    });
    
    return arr;
  } catch (err) {
    console.log(err.message);
    bot.sendMessage(user, 'Your link is not valid')
  }
};

let user; 

bot.on('message', async msg => {
  const text = msg.text;
  const chatId = msg.chat.id;
    user = await User.findOne({ id: chatId });
    if (!user) {
      user = await User.create({ id: chatId });
    }
    if (text === "/start") {
      await bot.sendMessage(chatId, "Send me a link to website");
    } else {
      user.website = text;
      user.lastURL = null;
      await user.save();
      await bot.sendMessage(chatId, `Your link is now ${text}`);
    }
});

cron.schedule('*/15 * * * * *', async () => {
  const users = await User.find({});
  users.forEach(async (user) => {
    const arr = await downloadPosts(user.website, user.id);
    if(arr && arr[0]) {
      if(arr[arr.length - 1].url === user.lastURL) {
        return
      }
      const { title, url } = arr[arr.length - 1]
        await bot.sendMessage(user.id, `${title}:\n${url}`)
        user.lastURL = url
        await user.save()
    }
  })
});