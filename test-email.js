require('dotenv').config();
const { sendOtpEmail } = require('./src/utils/emailService');

async function testEmail() {
  try {
    console.log('Sending test email...');
    const result = await sendOtpEmail('safiullahshahid12@gmail.com', '123456', 10);
    if (result) {
      console.log('Email sent successfully!', result.messageId);
    } else {
      console.log('Email sending failed. Check the logs for errors.');
    }
  } catch (error) {
    console.error('Error sending test email:', error);
  }
}

testEmail();
