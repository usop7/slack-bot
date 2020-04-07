const qs = require('querystring');
const fetch = require('node-fetch');
const BOT_TOKEN = process.env.BOT_TOKEN;
const VERIFICATION_TOKEN = process.env.VERIFICATION_TOKEN;
const NEWS_API_KEY = process.env.NEWS_API_KEY;


// Make sure it doesn't process for bot messages
const checkBot = (event) => {
  return new Promise((resolve, reject) => {
	if (event.event.bot_id) {
      reject('Bot Message');
    }
    resolve(event);
  });
}

// Verify Token
const verifyToken = (event) => {
  return new Promise((resolve, reject) => {
    if (event.token !== VERIFICATION_TOKEN) {
      reject('Invalid Token');
    }
    resolve(event);
  });
}

// Helper method to format date as 'yyyy-mm-dd'
const formatDate = (date) => {
  let d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) 
      month = '0' + month;
  if (day.length < 2) 
      day = '0' + day;

  return [year, month, day].join('-');
}

// Fetch News data and return the results
const getNewsData = (event) => {
  const keyword = event.event.text.trim();
  let oneWeekAgo = new Date().setDate(new Date().getDate() - 7);
  console.log('requesting news about' + keyword);
  const query = `https://content.guardianapis.com/search?q=${keyword}&from-date=${formatDate(oneWeekAgo)}&api-key=${NEWS_API_KEY}`;
  console.log(query);
  return fetch(query)
  .then(res => res.json())
  .then(data => data.response.results)
  .catch(err => console.log(err));
}

// Format News Data
const formatNewsData = (user, keyword, data) => {
  return new Promise((resolve, reject) => {
    let str = '';
    if (data.length === 0) {
      str = `Hey <@${user}>, There is no recent news about '${keyword}'`;
      resolve(str);
    } else {
      str = `Hey <@${user}>, News '${keyword}' are here!\n\n`;
    }
    for (const news of data) {
      str += `${news.webTitle} (${news.webPublicationDate})\n${news.webUrl}\n\n`;
    }
    resolve(str);
  });
}

// Post message to Slack
const post = (channel, user, data) => {
  const message = { 
    token: BOT_TOKEN,
    channel: channel,
    text: data
  };
  const query = qs.stringify(message);
  return fetch(`https://slack.com/api/chat.postMessage?${query}`);
}


// Lambda Handler
exports.bot = (event, context, callback) => {

  // slack url verification
  if (event.type === 'url_verification') {
    callback(null, event.challenge);
  }
  
  const text = event.event.text;
  const keyword = /^<@[A-Z0-9]*>(.+)/.exec(text)[1].trim();
  const channel = event.event.channel;
  const user = event.event.user;

  checkBot(event)
  .then(verifyToken)
  .then(getNewData)
  .then(formatNewsData.bind(null, user, keyword))
  .then(post.bind(null, channel, user))
  .catch(callback)
}