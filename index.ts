// Modules
import Stripe from "stripe";
import { join } from "path";
import { readFileSync, writeFileSync } from "fs";
import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";

// Types
type ApiKeys = {
  [k: string]: string;
};

type FixMccResult =
  | "PLATFORM_API_KEY_MISSING"
  | "ACCOUNT_NOT_RETRIEVABLE"
  | "NO_FIX_NEEDED"
  | "ACCOUNT_NOT_UPDATABLE"
  | "FIXED";

type AccountRecord = {
  connectedAccountId: string;
  platformAccountId: string;
};

type ResultRecord = {
  connectedAccountId: string;
  platformAccountId: string;
  result: FixMccResult;
};

// Config
const expectedMcc = "7512";
const apiKeysFilePath = join(__dirname, "./api-keys.json");
const accountsFilePath = join(__dirname, "./accounts.csv");
const resultsFilePath = join(__dirname, "./results.csv");
const apiKeys = JSON.parse(readFileSync(apiKeysFilePath, "utf-8")) as ApiKeys;

// MCC Fix
const fixMcc = async (
  platformAccountId: string,
  connectedAccountId: string
): Promise<FixMccResult> => {
  const logPrefix = `[${platformAccountId} / ${connectedAccountId}]`;

  // Pick correct API key based on Platform Account ID
  const apiKey = apiKeys[platformAccountId];
  if (!apiKey) {
    console.error(`${logPrefix} No API key for this Platform Account ID!`);
    return "PLATFORM_API_KEY_MISSING";
  }
  const stripe = new Stripe(apiKey, {
    apiVersion: "2022-08-01",
  });

  let account: Stripe.Account;

  // Retrieve account
  try {
    account = await stripe.accounts.retrieve(connectedAccountId);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error(
        `${logPrefix} Could not retrieve connected account: ${err.message}`
      );
    } else {
      console.error(`${logPrefix} Unknown error: ${err}`);
    }
    return "ACCOUNT_NOT_RETRIEVABLE";
  }

  // No need for an update
  if (account.business_profile?.mcc === expectedMcc) {
    console.log(`${logPrefix} No MCC fix needed!`);
    return "NO_FIX_NEEDED";
  }

  // Update account with the expected MCC
  try {
    account = await stripe.accounts.update(connectedAccountId, {
      business_profile: {
        mcc: expectedMcc,
      },
      metadata: {
        mcc_old_value: account.business_profile?.mcc || "n/a",
        mcc_fixed_at: new Date().toUTCString(),
      },
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error(
        `${logPrefix} Could not update connected account: ${err.message}`
      );
    } else {
      console.error(`${logPrefix} Unknown error: ${err}`);
    }
    return "ACCOUNT_NOT_UPDATABLE";
  }

  console.log(`${logPrefix} Set MCC to "${expectedMcc}"!`);

  return "FIXED";
};

const readAccountsCsv = () => {
  // Parsing synchronously is bad!
  // For larger files (10.000+ records) this might won't work.
  const csvBuffer = readFileSync(accountsFilePath);

  return parseCsv(csvBuffer, { columns: true }) as AccountRecord[];
};

const writeResultsCsv = (results: ResultRecord[]) => {
  const csvString = stringifyCsv(results, {
    header: true,
    columns: ["platformAccountId", "connectedAccountId", "result"],
  });
  writeFileSync(resultsFilePath, csvString, "utf-8");
};

const main = async () => {
  // Load account IDs
  const records = readAccountsCsv();
  const results: ResultRecord[] = [];

  // Update MCCs one by one
  for (const { platformAccountId, connectedAccountId } of records) {
    const result = await fixMcc(platformAccountId, connectedAccountId);
    results.push({
      platformAccountId,
      connectedAccountId,
      result,
    });
  }

  // Save results
  writeResultsCsv(results);
};

main();
