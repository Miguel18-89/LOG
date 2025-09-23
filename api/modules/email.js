let nodemailer = require("nodemailer");

exports.sendEmail = async (to, subject, message) => {
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth:{
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });

    const mailOptions = {
        from: "log@emg.com.pt",
        to: to,
        subejct: subject,
        text: message
    }

    await transporter.sendMail(mailOptions);
    
}