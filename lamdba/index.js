const axios = require('axios');
const querystring = require('querystring');

// CORS Headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const error = (err) => {
  const response = {
      statusCode: 200, // We're using a 200 error here to keep from getting a CORS error
      headers,
      body: JSON.stringify({error: err}),
  };
  return response;
}

const success = (body) => {
  const response = {
    statusCode: 200,
    headers,
    body,
};
return response;
}

exports.handler = async (event) => {

  // Check if this a CORS preflight from the browser
  if(event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
    }
  }

  // We'll be storing our secret as an environment variable for the lambda function
  const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET;
  const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

  try {
    // Check if there is a body on our event
    if(event.body) {
      // Parse the body as JSON and get the token from the body
      const body = JSON.parse(event.body);
      const token = body.token;

      // Post the token to google and check if it's a valid token
      const response = await axios.post(RECAPTCHA_VERIFY_URL, querystring.stringify({
        response: token,
        secret: RECAPTCHA_SECRET,
      }))

      if(response.data) {

        // Check if a score exists in the response.  If mnot there was an error
        if(response.data.score) {
          // At this point we will want to handle the submission of the form
        }

        return error(JSON.stringify(response.data))
      }
      return error(response)
    } else {
      return error('no body')
    }
  } catch(err) {
    return error(err)
  }
  
};
