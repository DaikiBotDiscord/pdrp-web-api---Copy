const router = require("express").Router();
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Model = require('../models/userAccounts');
const ModalReset = require('../models/passwordReset');

const requireHeader = (req, res, next) => {
    const requiredHeader = "token";
    const headerValue = req.get(requiredHeader);

    if (!headerValue) {
        return res
            .status(400)
            .json({ error: "Missing token header. Cannot complete request." });
    }

    if (headerValue !== process.env.REQUIRED_TOKEN) {
        return res
            .status(400)
            .json({ error: "Token doesn't match. Please try another" });
    } else {
        next();
    }
};

router.post('/request-password-reset/:email', requireHeader, async (req, res) => {
    function capitalizeFirstLetter(str) {
        return str?.charAt(0).toUpperCase() + str?.slice(1);
    }
    const data = await Model.findOne({ email: req.params.email });
    if (!data) {
        return res.status(404).json({ message: "User not found." });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expirationTime = Date.now() + 2 * 60 * 60 * 1000;

    const dataReset = await ModalReset.findOneAndDelete({ accountId: data._id })

    ModalReset.create({
        accountId: data._id,
        email: data.email,
        resetToken: token,
        resetTokenExpiry: expirationTime
    })

    console.log(`Reset Link: http://localhost:3000/reset-password?token=${token}`);

    data.resetToken = token;
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "support@daiki-bot.xyz",
            pass: process.env.EMAIL_PASSWORD
        }
    });
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pacific Dream Roleplay | Password Reset Request</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-image: linear-gradient(113deg, #1f2322cc 7%, #3a4e6ecc 93%), url('https://pacificdreamrp.com/pdrp_banner.png');
            background-size: cover; /* Adjust the background size as needed */
            background-position: center center; /* Center the background image */
            color: #ffffff; /* Set text color to white or a contrasting color */
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            background-color: #fff;
            border-radius: 5px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #333;
        }
        p {
            color: #555;
        }
        .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #007bff;
            color: #ffffff
            text-decoration: none;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Pacific Dream Roleplay | Password Reset Request</h1>
        <p>Dear ${capitalizeFirstLetter(data.fname)},</p>
        <p>You recently requested to reset your password for Pacific Dream Roleplay account. To proceed with the password reset, please click the following link:</p>
        <a href="http://localhost:3000/reset-password?token=${token}" class="button">Reset Password</a>
        <p>This link is valid for 2 hours. If you did not request this password reset, you can safely ignore this email.</p>
        <p>For security reasons, do not share this link with others. If you have any questions or need further assistance, please contact our support team on <a href="https://discord.gg/7nHcFJa4">Discord</a>.</p>
        <p>Thank you,<br>Pacific Dream Support Team</p>
        <br></br>
        <p>If the link above doesn't work please visit https://pacificdreamrp.com/reset-password and enter the following token in the token field: ${token}</p>
    </div>
</body>
</html>
`;
    transporter.sendMail({
        sender: 'noreply@daiki-bot.xyz',
        to: data.email,
        subject: "Pacific Dream RP | Password Reset Request | DO NOT REPLY",
        from: "noreply@daiki-bot.xyz",
        html: htmlContent
    }, function (error, info) {
        if (error) {
            res.send({ error: error }).status(500)
            console.log(error);
        } else {
            console.log("email sent!")
            res.send({ message: "Password Reset Request Email Sent", Link: `http://localhost:3000/reset-password?token=${token}` }).status(200)
        }
    })
})

router.post('/reset-password', requireHeader, async (req, res) => {
    const { token, newPassword } = req.body;

    const user = await ModalReset.findOne({ resetToken: token })

    if (!user || user.resetTokenExpiry < Date.now()) {
        console.log('invalid')
        return res.send({ message: 'Invalid or expired token' });
    }
    const data = await Model.findById(user.accountId)

    const encryptedNewPassword = await bcrypt.hash(newPassword, 10);

    data.password = encryptedNewPassword;

    data.save()

    user.delete();
    res.status(200).json({ message: "Password Reset Successful" })
});


module.exports = router;