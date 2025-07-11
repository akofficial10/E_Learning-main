/*import nodemailer from "nodemailer";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

export const sendCertificateEmail = async (toEmail, certPath) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Course Platform" <${process.env.MAIL_ID}>`,
    to: toEmail,
    subject: "Course Completion Certificate",
    text: "Congratulations! Find your course completion certificate attached.",
    attachments: [
      {
        filename: "certificate.pdf",
        path: certPath,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
  //fs.unlinkSync(certPath); // cleanup
};
*/

import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const sendCertificateEmail = async (toEmail, certPath) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_ID,
      pass: process.env.MAIL_PASSWORD,
    },
    tls: {
      //  Allow self-signed certificates (for development only)
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"Course Platform" <${process.env.MAIL_ID}>`,
    to: toEmail,
    subject: "Course Completion Certificate",
    text: "Congratulations! Find your course completion certificate attached.",
    attachments: [
      {
        filename: "certificate.pdf",
        path: certPath,
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(" Email sent to:", toEmail);
  } catch (error) {
    console.error(" Failed to send email:", error);
  }

  // Optional: clean up certificate after sending
    //fs.unlinkSync(certPath);
};
