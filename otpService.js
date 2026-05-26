const nodemailer = require("nodemailer");

const otpStore = {};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP
async function sendOTP(email) {

  const otp = generateOTP();

  otpStore[email] = otp;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "REDACT Verification Code",
    html: `
      <div style="font-family:Arial;padding:20px;">
        <h2>REDACT Security Verification</h2>
        <p>Your OTP code is:</p>
        <h1 style="letter-spacing:5px;">${otp}</h1>
        <p>This code expires in 5 minutes.</p>
      </div>
    `
  });

  return true;
}

// Verify OTP
function verifyOTP(email, otp) {

  return otpStore[email] === otp;

}

module.exports = {
  sendOTP,
  verifyOTP
};
