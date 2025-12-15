import nodemailer from "nodemailer";

type EmailOptions = {
  to: string;
  from: string;
  subject: string;
  html: string;
};

export async function sendEmailInbucket({
  from,
  to,
  subject,
  html,
}: EmailOptions) {
  try {
    const transporter = nodemailer.createTransport({
      host: "localhost", // replace with your Inbucket server address
      port: 54325, // within docker port is 2500, but it exposed as 54325 on localhost
      connectionTimeout: 2000, // 2 second timeout
    });

    await transporter.verify();

    await transporter.sendMail({
      from,
      subject,
      html,
      to,
    });

    console.log(`📧 Email sent to Inbucket: ${to} - ${subject}`);
  } catch (error: any) {
    // If Inbucket is not running, log the email details instead
    if (error.code === "ECONNREFUSED" || error.code === "ESOCKET") {
      console.log("📧 Inbucket not running. Email would be sent:");
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   From: ${from}`);
      console.log(`   Preview: ${html.substring(0, 100)}...`);
      // Don't throw - allow the flow to continue
      return;
    }
    // For other errors, log but don't throw
    console.error("Failed to send email to Inbucket:", error);
  }
}
