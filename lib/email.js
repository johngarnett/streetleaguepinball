const nodemailer = require('nodemailer');

const config = require('../config');
const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: config.EMAIL_PORT,
  auth: {
    user: config.EMAIL_ADDRESS,
    pass: config.EMAIL_PASSWORD,
  },
});
transporter.verify().then(console.log).catch(console.error);

/*
 * This is the easiest way to send gmail.  We use a dedicated gmail
 * account for sending.  Also, the account is set to 2 factor auth;
 * and a special password for this app is set up.  So our app is
 * granted the ability to access mail (but does not have full access
 * to the gmail account).
 */
function send(to,subject,message, htmlMessage) {
  const emailName = config.EMAIL_NAME;
  const emailAddress = config.EMAIL_ADDRESS;
  transporter.sendMail({
    from: emailName + ' <' + emailAddress + '>', // sender address
    to: to, // list of receivers
    subject: subject, // Subject line
    text: message, // plain text body
    html: htmlMessage, // html body
  }).then(info => {
    console.log({info});
  }).catch(console.error);
}

module.exports = {
  send: send
};
