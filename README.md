# Using a ReCAPTCHA On a Statically Generated Site

**SPAM**

Static sites have started to become popular again with the introduction of frameworks like NextJS or NuxtJS.  There are plenty of benefits to using these but there can also be some hangups with them.  Shifting a mindset to statically generated and hosted site can be a bit difficult but that doesn't mean we have to put off features that a traditionally served website would have.

## Setting The Stage

**Some image of a diagram of a statically hosted and served website**

Lets consider this use case:

You have a statically generated website that is going to be statically hosted in a cloud storage provider like Amazon's Simple Storage Service – which is a very common scenario for NextJS and NuxtJS applications.

This means you have generated some html, css, and js files and that you don't have a dedicate server running that will be serving these files.

Now, on this website you want to gather contact information from the visitors on the website.  Great! ...but where do you post to?

When we had an express server serving our website this would be simple.  We would set up a new handler for a POST request with form data and things would be jolly.

But this site is statically hosted and we aren't able to setup an endpoint the same way we used to.  You're a smart and competent engineer so you setup a lambda function to handle this.  

But now you wonder:

"How do I prevent getting spam on this form?"

## The Reason You Came Here

**Meat and Potatoes**

This article is going to assume you already have a statically hosted website and you have a lambda function using API Gateway.  If not, check out this code [here](https://github.com/dickmanben/static-site-recaptcha).

### Enter: reCAPTCHA

The creators of things often explain them the best so [here you go](https://support.google.com/recaptcha/answer/6080904?hl=en).

>reCAPTCHA is a free service from Google that helps protect websites from spam and abuse.

A reCAPTCHA are those check boxes on forms that asks you if you are a robot or not and then you help out Google classifying some images for their machine learning algorithms.  [At least maybe...](https://www.techradar.com/news/captcha-if-you-can-how-youve-been-training-ai-for-years-without-realising-it)

In all seriousness these buttons solve a real problem: Keeping bots and scripts from posting your forms.

NextJS and NuxtJS both have great support for Google's ReCAPTCHA!  

We're going to use NuxtJS and the reCAPTCHA v3 but the implementation here is fairly similar on NextJS, and the v2 is also a pretty similar setup.

For NuxtJS we're going to stick with `@nuxtjs/recaptcha`, check them out [here](https://github.com/nuxt-community/recaptcha-module).

In a fresh `create-nuxt-app` we're going to follow the directions and end up with a `modules` proprety like so.

``` js
...
modules: [
    [
      '@nuxtjs/recaptcha', {
        hideBadge: false,
        siteKey: 'YOUR_SITE_KEY',
        version: 3
      }
    ]
  ],
...
```

When we do this and rebuild our app we see a badge on the lower right side of our screen when navigating to http://localhost:3000.  I won't hide the badge because I kind of like having it on there, and if you do end up hiding it then you'll "need" to add text referring to the usage of their service.

## Verifying Users

In order to verify our users we'll need to first get the token from the `recaptcha` function will get injected into the nuxt application.  Let's do so by adding a method on the `index.vue` file in pages.

``` js
async getToken () {
  this.token = await this.$recaptcha.execute('homepage')
},
```

What this does is call the `execute` method that is available on the `recaptcha` class.  The parameter we provide, in this case `homepage`, is the action and can be viewed inside the reCAPTCHA Admin Console.

So, cool, we have a token!  Yay.  No more robots right?

We're not quite there yet.  Just having a token on the website doesn't mean much.  After all, this code is generated on the FE and can be spoofed or bypassed.  The next step is to validate this token with Google.

To do this I'm going to modify my existing lambda function that handles my form submissions.

## Lambda

Below is the code I have written that handles validating a token from the reCAPTCHA v3.

``` js
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
      statusCode: 500,
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

        // Check if a score exists in the response.  If it's not there than we had an error
        if(response.data.score) {
          // At this point we will want to handle the submission of the form
        }

        // we return successfully because the verification request succeeded with a 200 status code, we just didn't get the result we wanted.  You might wish to respond with a 400 level error code.
        return success(JSON.stringify(response.data))
      }
      return error(response)
    } else {
      return error('no body')
    }
  } catch(err) {
    return error(err)
  }
};
```

Let's break it down a bit.

Here we have the necessary CORS headers.  CORS stands for Cross-Origin Resource Sharing.  This allows browsers to send request to different domains.  Back in the day there were issues with cross domain requests and this was added to prevent abuse.

``` js
// CORS Headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

For `Access-Control-Allow-Origin` we can set this to only the domain that is submitting the form if you would like. I have this set to * on my lambda since I support a couple different domains and their different forms.  That and I'm too lazy to change add them individually every time.


While we're on the topic of CORS.  Browsers will make Pre-Flight Requests.  These are light HTTP requests to ensure they can even make requests to those outside domains.  You'll want to have this code at the top of your function.

``` js 
  // Check if this a CORS preflight from the browser
  if(event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
    }
  }
```

This code will check if the request is a pre-flight or not and if it is it will immediately return a successful status code along with the CORS headers.

Now to the actual reCAPTCHA Code:

We are goign to work on getting the token from the body.  This token will be sent to google to verify the user visiting your website.  

If the token verification isn't successful Google will return an array of `error-codes` that will contain the errors that are present in your request.  If Google successfully verifies the token we will get a score back.

``` js
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

      // Check if a score exists in the response.  If it's not there than we had an error
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
```

How you want to handle this score is up to you.  For me I will handle the form if we get anything greater than `.4`.  If a Bot has a `.4` score then I am most definitely interested in hearing from them.  For you, you might consider going higher.  The lower the score the more likely it is that the user isn't human.

## Overview

As you can see, this is pretty simple to set up and does not require a lot of additional work.  For a working demo check out: https://recaptcha-demo.guanaco.dev/

This demo site is setup using the NuxtJS code found in the [respositroy](https://github.com/dickmanben/static-site-recaptcha) and is stored in AWS S3 and served using AWS Cloudfront.

I hope this helps!  If you have any questions or suggestions keep them to yourself! Or leave them in the comments below. 

Please help contribute to the project at [Github](https://github.com/dickmanben/static-site-recaptcha)!
