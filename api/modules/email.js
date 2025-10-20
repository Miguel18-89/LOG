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
        from: "LOG",
        to: to,
        subject: subject,
        text: message
    }

    await transporter.sendMail(mailOptions);
    
}