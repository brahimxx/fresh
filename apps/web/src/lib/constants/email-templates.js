export function getVerificationEmailTemplate(firstName, verifyUrl) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Verify your email address - Fresh</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
            line-height: 1.5;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #f3f4f6;
          }
          .header {
            padding: 32px 40px 24px;
            text-align: center;
          }
          .logo {
            font-size: 28px;
            font-weight: 800;
            color: #111827;
            letter-spacing: -0.05em;
            margin: 0;
          }
          .content {
            padding: 0 40px 40px;
            text-align: center;
          }
          .title {
            font-size: 22px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 16px;
          }
          .text {
            font-size: 16px;
            color: #4b5563;
            margin: 0 0 32px;
            line-height: 1.625;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            background-color: #8B5CF6;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            border-radius: 8px;
            font-size: 16px;
            transition: background-color 0.2s ease;
          }
          .button:hover {
            background-color: #7c3aed;
          }
          .footer {
            padding: 24px 40px;
            background-color: #f9fafb;
            border-top: 1px solid #f3f4f6;
            text-align: center;
          }
          .footer-text {
            font-size: 13px;
            color: #6b7280;
            margin: 0;
          }
          @media (max-width: 600px) {
            .container {
              margin: 20px 16px;
              border-radius: 8px;
            }
            .header, .content, .footer {
              padding-left: 24px;
              padding-right: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">Fresh</h1>
          </div>
          <div class="content">
            <h2 class="title">Welcome, ${firstName}!</h2>
            <p class="text">
              Thanks for joining us. To fully secure your account and unlock all features, please confirm your email address by clicking the button below.
            </p>
            <a href="${verifyUrl}" class="button">Verify Email</a>
          </div>
          <div class="footer">
            <p class="footer-text">
              If you didn't request this verification, you can safely ignore this email.<br/>
              This link will expire in 24 hours.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}