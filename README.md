# bulk-mcc-updater

> Bulk MCC Updater for Connected Accounts

**THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.**

## Prep work

Copy the API keys template and fill out the Platform-Account-ID-API-Key-mapping

```bash
cp api-keys.example.json api-keys.json
```

Copy the Account data CSV and and populate it with the accounts, which should be updated.

```bash
cp accounts.example.csv accounts.csv
```

## Usage

Install deps:

```bash
npm install
# or
yarn
```

Run script:

```bash
npm start
# or
yarn start
```
