# Item CSV Builder

Simple browser app for capturing price-change rows (item number, country, new price, optional lifecycle code, activation date) and exporting them to CSV so you can send the file manually.

## Getting Started

```bash
npm install
npm run dev    # runs nodemon -> http://localhost:3000
# or
npm start      # plain node
```

Running the server lets you open `http://localhost:3000`, but you can also double‑click `public/index.html` and use it directly from disk.

The UI supports:

- Adding/removing rows for `item number`, `country`, `new price`, optional `product lifecycle`, and `activation date`
- Generating and downloading a semicolon-delimited CSV (`ITEM NUMBER;COUNTRY;NEW PRICE;NEW PRODUCT LIFECYCLE;ACTIVATION DATE;KEY`) locally
- Using the status banner to confirm success/errors (no network required)

Once the CSV is downloaded, attach it to an email with your preferred mail client. The lifecycle column is optional—leave it blank if you do not want to update it.
