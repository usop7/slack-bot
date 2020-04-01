const qs = require('querystring');
const fetch = require('node-fetch');
const BOT_TOKEN = process.env.BOT_TOKEN;
const VERIFICATION_TOKEN = process.env.VERIFICATION_TOKEN;
const NEWS_API_KEY = process.env.API_KEY;

// Verify Url
const verifyUrl = (event) => {
  return new Promise((resolve, reject) => {
    if (event.type === 'url_verification') {
      resolve(event.challenge);
    }
    resolve(event);
  });
}

// Make sure it doesn't process for bot messages
const checkBot = (event) => {
  if (!event.event.bot_id) {
    return event;
  }
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
formatDate = (date) => {
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
  return fetch(`https://content.guardianapis.com/search?q=${keyword}&from-date=${formatDate(oneWeekAgo)}&api-key=${NEWS_API_KEY}`)
  .then(res => res.json())
  .then(data => data.response.results)
  .catch(err => err);
}

// Format News Data
const formatNewsData = (user, keyword, data) => {
  return new Promise((resolve, reject) => {
    let str = '';
    if (data.length === 0) {
      str = `<@${user}> There is no recent news about '${keyword}'`;
      resolve(str);
    } else {
      str = `<@${user}> Here is the recent news about '${keyword}'\n\n`;
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
  const text = event.event.text;
  const keyword = /^<@[A-Z0-9]*>(.+)/.exec(text)[1].trim();
  const channel = event.event.channel;
  const user = event.event.user;

  verifyUrl(event)
  .then(checkBot)
  .then(verifyToken)
  .then(getNewsData)
  .then(formatNewsData.bind(null, user, keyword))
  .then(post.bind(null, channel, user))
  .catch(callback)
}