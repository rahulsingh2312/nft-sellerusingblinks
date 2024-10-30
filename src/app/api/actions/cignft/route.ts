import { NextRequest } from 'next/server'
import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions"
import { Transaction, PublicKey, ComputeBudgetProgram, Connection, clusterApiUrl } from "@solana/web3.js"
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token"

// Set the base API URL and relevant constants
const ACTION_URL = "https://nft.sickfreak.club/api/actions/cignft"
const ADDRESS = new PublicKey('rAhULHBrf2yGuANDuAGLuUTKuLCW17t86T8T6vGcuok')
const SEND_TOKEN_MINT = new PublicKey("SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa")
const BASE_SEND_AMOUNT = 16942
const INCREASE_PER_MINUTE = 1

// Define the starting timestamp in milliseconds for 10:14 PM IST, October 30
const startTimestamp = new Date("2024-10-30T16:44:00.000Z").getTime() // 10:14 PM IST to UTC

// Function to get the dynamically updated SEND_AMOUNT
const getCurrentSendAmount = () => {
  const minutesSinceStart = Math.floor((Date.now() - startTimestamp) / 60000)
  return BASE_SEND_AMOUNT + minutesSinceStart * INCREASE_PER_MINUTE
}

export const GET = async (req: Request) => {
  const SEND_AMOUNT = getCurrentSendAmount()

  const payload: ActionGetResponse = {
    icon: "https://nft.sickfreak.club/cignft.jpeg",
    label: "Buy Aesthetic cig NFT",
    title: "cig NFT (only 1 in existence)",
    description: `Purchase a cig NFT for ${SEND_AMOUNT} tokens`,
    disabled: false,
    links: {
      actions: [
        {
          href: `${ACTION_URL}`,
          label: `buy with ${SEND_AMOUNT} SEND Tokens`,
          type: 'transaction'
        }
      ]
    }
  }

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS
  })
}

export const OPTIONS = GET

export const POST = async (req: NextRequest) => {
  try {
    const body: ActionPostRequest = await req.json()
    const account = new PublicKey(body.account)
    const connection = new Connection("https://mainnet.helius-rpc.com/?api-key=215399cd-1d50-4bdf-8637-021503ae6ef3")

    const transaction = new Transaction()

    // Increase compute budget
    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000
      })
    )

    // Get sender's associated token account for SEND token
    const senderTokenAccount = await getAssociatedTokenAddress(SEND_TOKEN_MINT, account)

    // Get receiver's associated token account for SEND token
    const receiverTokenAccount = await getAssociatedTokenAddress(SEND_TOKEN_MINT, ADDRESS)

    // Get the updated SEND_AMOUNT based on current time
    const SEND_AMOUNT = getCurrentSendAmount()

    // Add token transfer instruction
    transaction.add(
      createTransferInstruction(
        senderTokenAccount,
        receiverTokenAccount,
        account,
        SEND_AMOUNT,
        [],
        TOKEN_PROGRAM_ID
      )
    )

    // Set fee payer and recent blockhash after adding instructions
    transaction.feePayer = account
    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash

    // Serialize the transaction for proper preview handling
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction: Transaction.from(serializedTransaction),
        message: `You have purchased cig NFT (only 1 in existence).`,
      },
    })

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS })
  } catch (err) {
    console.error(err)
    return Response.json("An unknown error occurred", { status: 500 })
  }
}
