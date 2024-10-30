import { NextRequest, NextResponse } from 'next/server';
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
  SystemProgram,
} from "@solana/web3.js";

// Constants
const ACTION_URL = "https://pay.rahulol.me/api/actions/cignft";
const ADDRESS = new PublicKey('rAhULHBrf2yGuANDuAGLuUTKuLCW17t86T8T6vGcuok');
const BASE_SOL_AMOUNT = 0.16942;  // 16.942k SEND equivalent in SOL
const INCREASE_PER_MINUTE =   0.00001;  // 0.00001 SOL per minute
const startTimestamp = new Date("2024-10-30T16:44:00.000Z").getTime();  // Start in UTC

// Get the dynamically updated SOL_AMOUNT
const getCurrentSolAmount = () => {
  const minutesSinceStart = Math.floor((Date.now() - startTimestamp) / 60000);
  return BASE_SOL_AMOUNT + minutesSinceStart * INCREASE_PER_MINUTE;
};

export const GET = async (req: NextRequest) => {
  const SOL_AMOUNT = getCurrentSolAmount();

  const payload: ActionGetResponse = {
    icon: "https://pay.rahulol.me/cignft.jpeg",
    label: "Buy Aesthetic cig NFT",
    title: "cig NFT (only 1 in existence)",
    description: `Purchase a cig NFT for ${SOL_AMOUNT} SOL`,
    disabled: false,
    links: {
      actions: [
        {
          href: `${ACTION_URL}`,
          label: `buy with ${SOL_AMOUNT} SOL`,
          type: 'transaction'
        }
      ]
    }
  };

  return new Response(JSON.stringify(payload), {
    headers: ACTIONS_CORS_HEADERS
  });
};

export const POST = async (req: NextRequest) => {
  try {
    const body: ActionPostRequest = await req.json();
    const account = new PublicKey(body.account);
    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=215399cd-1d50-4bdf-8637-021503ae6ef3");
    
    // Create transaction
    const transaction = new Transaction();
    console.log("Transaction created");

    // Increase compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000
      })
    );

    const SOL_AMOUNT = getCurrentSolAmount();
    const lamports = Math.floor(SOL_AMOUNT * 1e9); // Convert SOL to lamports (1 SOL = 1e9 lamports)

    // Add SOL transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: account,  // Payer's public key
        toPubkey: ADDRESS,    // Recipient's public key
        lamports: lamports,   // Amount in lamports
      })
    );

    // Set fee payer and get recent blockhash
    transaction.feePayer = account;
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;

    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    // Convert the serialized transaction to base64
    const base64Transaction = Buffer.from(serializedTransaction).toString('base64');

    // Return the response in the correct format for Blinks
    return NextResponse.json({
      transaction: base64Transaction,
      message: "You have purchased cig NFT (only 1 in existence).",
    });

  } catch (error) {
    console.error("Error processing transaction:", error);
    return NextResponse.json(
      { error: "Failed to process transaction", details: (error as Error).message },
      { status: 500 }
    );
  }
}

export const OPTIONS = POST;
