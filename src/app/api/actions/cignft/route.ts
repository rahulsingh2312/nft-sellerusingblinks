import { NextRequest } from 'next/server';
import {
  ActionGetResponse,
  ActionPostRequest,
  ActionPostResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse
} from "@solana/actions";
import {
  Transaction,
  PublicKey,
  ComputeBudgetProgram,
  Connection,
  ParsedAccountData
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";

// Constants
const ACTION_URL = "https://pay.rahulol.me/api/actions/cignft";
const ADDRESS = new PublicKey('rAhULHBrf2yGuANDuAGLuUTKuLCW17t86T8T6vGcuok');
const SEND_TOKEN_MINT = new PublicKey("SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa");
const BASE_SEND_AMOUNT = 1 ;  // 16.942k SEND in 6-decimal format
const INCREASE_PER_MINUTE = 0 ;
const startTimestamp = new Date("2024-10-30T16:44:00.000Z").getTime();  // Start in UTC

// Get the dynamically updated SEND_AMOUNT
const getCurrentSendAmount = () => {
  const minutesSinceStart = Math.floor((Date.now() - startTimestamp) / 60000);
  return (BASE_SEND_AMOUNT + minutesSinceStart * INCREASE_PER_MINUTE) * 1000000;  // Adjust for 6 decimals
};

export const GET = async (req: NextRequest) => {
  const SEND_AMOUNT = getCurrentSendAmount();

  const payload: ActionGetResponse = {
    icon: "https://pay.rahulol.me/cignft.jpeg",
    label: "Buy Aesthetic cig NFT",
    title: "cig NFT (only 1 in existence)",
    description: `Purchase a cig NFT for ${SEND_AMOUNT / 1000000} SEND tokens`,
    disabled: false,
    links: {
      actions: [
        {
          href: `${ACTION_URL}`,
          label: `buy with ${SEND_AMOUNT / 1000000} SEND Tokens`,
          type: 'transaction'
        }
      ]
    }
  };

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS
  });
};
export const OPTIONS = GET;

export const POST = async (req: NextRequest) => {
  try {
    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);
    const connection = new Connection("https://devnet.helius-rpc.com/?api-key=215399cd-1d50-4bdf-8637-021503ae6ef3");
    
    // Function to get number of decimals for the token mint
    // async function getNumberDecimals(mintAddress: PublicKey): Promise<number> {
    //   const info = await connection.getParsedAccountInfo(mintAddress);
    //   const result = (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
    //   return result;
    // }
    
    // Create transaction
    const transaction = new Transaction();
    console.log("Transaction created");
    console.log(transaction);
    // Increase compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000
      })
    );
    console.log("Compute budget increased");
    console.log(transaction);
    
    // Get sender's associated token account address
    const senderTokenAccount = await getAssociatedTokenAddress(
      SEND_TOKEN_MINT,
      account
    );
    console.log("Sender's associated token account address");
    console.log(senderTokenAccount);
    // Get receiver's associated token account address
    const receiverTokenAccount = await getAssociatedTokenAddress(
      SEND_TOKEN_MINT,
      ADDRESS
    );
    console.log("Receiver's associated token account address");
    console.log(receiverTokenAccount);  
    // Get token decimals
    const numberDecimals = 6;
    
    // Calculate the amount with proper decimal places
    const SEND_AMOUNT = getCurrentSendAmount();
    const adjustedAmount = SEND_AMOUNT * Math.pow(10, numberDecimals);
    console.log("Adjusted amount");
    console.log(adjustedAmount);    
    // Add token transfer instruction
    transaction.add(
      createTransferInstruction(
        senderTokenAccount,  // from (PublicKey)
        receiverTokenAccount,  // to (PublicKey)
        account,  // owner
        adjustedAmount,  // amount adjusted for decimals
        [],  // multiSigners
        TOKEN_PROGRAM_ID
      )
    );
    console.log("Token transfer instruction added");
    console.log(transaction);
    
    // Set fee payer and get recent blockhash
    transaction.feePayer = account;
    console.log("Fee payer set");
    console.log(transaction);
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    console.log("Recent blockhash set");
    console.log(transaction);
    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    console.log("Transaction serialized");
    console.log(serializedTransaction);
    
    // Create response payload
    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction: Transaction.from(serializedTransaction),
        message: `You have purchased cig NFT (only 1 in existence).`,
      },
    });
    console.log("Response payload created");    
    console.log(payload)
    
    return new Response(JSON.stringify(payload), { headers: ACTIONS_CORS_HEADERS });
  } catch (err) {
    console.error(err);
    return new Response("An unknown error occurred", { status: 500 });
  }
};