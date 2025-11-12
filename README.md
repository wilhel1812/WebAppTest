# Item CSV Mailer

Simple full-stack app that lets you capture rows of line-item data, download them as a CSV, and email the CSV as an attachment with one click.

## Getting Started

```bash
npm install
npm run dev    # runs nodemon -> http://localhost:3000
# or
npm start      # plain node
```

Set the email credentials before launching the server. Create an `.env` file in the project root:

```
MAIL_HOST=smtp.mailtrap.io        # or any SMTP host
MAIL_PORT=2525
MAIL_SECURE=false                 # true only if you use port 465
MAIL_USER=your_smtp_username
MAIL_PASS=your_smtp_password
MAIL_FROM="Sender Name <sender@example.com>"
```

The frontend lives in `/public` and is served statically by Express. It supports:

- Adding/removing rows for `itemNumber`, `country`, `price`, and `date`
- Downloading the entered data as a CSV file
- Submitting the data to `/api/send-csv` to email the CSV attachment

## API

`POST /api/send-csv`

```json
{
  "recipientEmail": "user@example.com",
  "subject": "Optional subject",
  "message": "Optional plain-text body",
  "rows": [
    { "itemNumber": "123", "country": "US", "price": "19.99", "date": "2024-06-05" }
  ]
}
```

The server validates input, builds the CSV, and sends it using Nodemailer with the configured SMTP transport. Check the console logs if sending fails.
