import nodemailer from "nodemailer";
import { config } from "../config";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: Number(config.email.port),
  secure: Number(config.email.port) === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export default transporter;

export const verifyTransporter = async () => {
  await transporter.verify();
};

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions) => {
  return transporter.sendMail({
    from: from || config.email.user,
    to,
    subject,
    html,
    text,
  });
};