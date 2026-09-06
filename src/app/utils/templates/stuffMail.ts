type EmployeeWelcomeEmailParams = {
  name: string;
  email: string;
  password: string;
  role: string;
  phone?: string;
  joiningDate: string;
  loginUrl: string;
  companyName?: string;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const generateEmployeeWelcomeEmail = ({
  name,
  email,
  password,
  role,
  phone,
  joiningDate,
  loginUrl,
  companyName = "CommerceOS",
}: EmployeeWelcomeEmailParams) => {
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePassword = escapeHtml(password);
  const safeRole = escapeHtml(role);
  const safePhone = phone ? escapeHtml(phone) : "";
  const safeJoiningDate = escapeHtml(joiningDate);
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeCompanyName = escapeHtml(companyName);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>Welcome to ${safeCompanyName}</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6f8;
      font-family: Arial, Helvetica, sans-serif;
      color: #17202a;
    }

    table {
      border-collapse: collapse;
    }

    .wrapper {
      width: 100%;
      background-color: #f4f6f8;
      padding: 40px 15px;
    }

    .container {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
    }

    .header {
      padding: 32px 35px;
      background-color: #111827;
      text-align: center;
    }

    .logo {
      display: inline-block;
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      text-decoration: none;
      letter-spacing: -0.5px;
    }

    .content {
      padding: 40px 35px;
    }

    .greeting {
      margin: 0 0 14px;
      font-size: 26px;
      line-height: 1.3;
      font-weight: 700;
      color: #111827;
    }

    .intro {
      margin: 0 0 28px;
      font-size: 15px;
      line-height: 1.7;
      color: #667085;
    }

    .success-box {
      margin-bottom: 28px;
      padding: 18px 20px;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
    }

    .success-title {
      margin: 0 0 5px;
      font-size: 15px;
      font-weight: 700;
      color: #166534;
    }

    .success-text {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: #15803d;
    }

    .section-title {
      margin: 0 0 14px;
      font-size: 15px;
      font-weight: 700;
      color: #111827;
    }

    .details {
      width: 100%;
      margin-bottom: 28px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .details td {
      padding: 13px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }

    .details tr:last-child td {
      border-bottom: none;
    }

    .label {
      width: 38%;
      color: #667085;
      background-color: #f9fafb;
      font-weight: 500;
    }

    .value {
      color: #111827;
      font-weight: 600;
    }

    .credentials {
      margin-bottom: 28px;
      padding: 22px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
    }

    .credential-row {
      margin-bottom: 14px;
    }

    .credential-row:last-child {
      margin-bottom: 0;
    }

    .credential-label {
      display: block;
      margin-bottom: 5px;
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .credential-value {
      display: block;
      font-size: 14px;
      color: #0f172a;
      font-weight: 600;
      word-break: break-word;
    }

    .password {
      font-family: monospace;
      letter-spacing: 0.5px;
    }

    .button-wrapper {
      text-align: center;
      padding: 4px 0 28px;
    }

    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #111827;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      border-radius: 9px;
    }

    .notice {
      padding: 16px 18px;
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 10px;
      margin-bottom: 28px;
    }

    .notice p {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      color: #92400e;
    }

    .footer {
      padding: 25px 35px;
      background-color: #f9fafb;
      border-top: 1px solid #eef0f2;
      text-align: center;
    }

    .footer p {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: #98a2b3;
    }

    @media only screen and (max-width: 600px) {
      .wrapper {
        padding: 20px 10px;
      }

      .content {
        padding: 30px 22px;
      }

      .header {
        padding: 26px 22px;
      }

      .footer {
        padding: 22px;
      }

      .greeting {
        font-size: 23px;
      }

      .details td {
        padding: 11px 12px;
      }

      .label {
        width: 35%;
      }
    }
  </style>
</head>

<body>
  <div class="wrapper">
    <table width="100%" role="presentation">
      <tr>
        <td align="center">

          <table class="container" role="presentation">

            <!-- Header -->
            <tr>
              <td class="header">
                <div class="logo">
                  ${safeCompanyName}
                </div>
              </td>
            </tr>

            <!-- Main Content -->
            <tr>
              <td class="content">

                <h1 class="greeting">
                  Welcome to ${safeCompanyName}, ${safeName}! 🎉
                </h1>

                <p class="intro">
                  Congratulations! Your employee account has been successfully
                  created. We're excited to have you as part of the team.
                </p>

                <!-- Success Message -->
                <div class="success-box">
                  <p class="success-title">
                    Your account is ready
                  </p>

                  <p class="success-text">
                    You can now sign in to ${safeCompanyName} using the
                    credentials provided below.
                  </p>
                </div>

                <!-- Employee Information -->
                <p class="section-title">
                  Employee Information
                </p>

                <table class="details" role="presentation">
                  <tr>
                    <td class="label">Name</td>
                    <td class="value">${safeName}</td>
                  </tr>

                  <tr>
                    <td class="label">Role</td>
                    <td class="value">${safeRole}</td>
                  </tr>

                  <tr>
                    <td class="label">Joining Date</td>
                    <td class="value">${safeJoiningDate}</td>
                  </tr>

                  ${
                    safePhone
                      ? `
                  <tr>
                    <td class="label">Phone</td>
                    <td class="value">${safePhone}</td>
                  </tr>
                  `
                      : ""
                  }
                </table>

                <!-- Login Credentials -->
                <p class="section-title">
                  Login Credentials
                </p>

                <div class="credentials">

                  <div class="credential-row">
                    <span class="credential-label">
                      Email
                    </span>

                    <span class="credential-value">
                      ${safeEmail}
                    </span>
                  </div>

                  <div class="credential-row">
                    <span class="credential-label">
                      Temporary Password
                    </span>

                    <span class="credential-value password">
                      ${safePassword}
                    </span>
                  </div>

                </div>

                <!-- Login Button -->
                <div class="button-wrapper">
                  <a
                    href="${safeLoginUrl}"
                    class="button"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Sign in to ${safeCompanyName}
                  </a>
                </div>

                <!-- Security Notice -->
                <div class="notice">
                  <p>
                    <strong>Security reminder:</strong>
                    This password was generated for your initial login.
                    Please change your password immediately after signing in
                    and keep your credentials private.
                  </p>
                </div>

                <p class="intro" style="margin-bottom: 0;">
                  Welcome aboard! If you have any questions or need help
                  accessing your account, please contact your administrator.
                </p>

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="footer">
                <p>
                  © ${new Date().getFullYear()} ${safeCompanyName}.
                  All rights reserved.
                </p>

                <p style="margin-top: 6px;">
                  This is an automated email. Please do not reply directly
                  to this message.
                </p>
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

  const text = `
Welcome to ${companyName}, ${name}! 🎉

Congratulations! Your employee account has been successfully created.
We're excited to have you as part of the team.

EMPLOYEE INFORMATION
--------------------
Name: ${name}
Role: ${role}
Joining Date: ${joiningDate}
${phone ? `Phone: ${phone}\n` : ""}

LOGIN CREDENTIALS
-----------------
Email: ${email}
Temporary Password: ${password}

Login: ${loginUrl}

SECURITY REMINDER
-----------------
Please change your password immediately after signing in and keep
your credentials private.

Welcome aboard!

© ${new Date().getFullYear()} ${companyName}. All rights reserved.
`;

  return {
    html,
    text,
  };
};