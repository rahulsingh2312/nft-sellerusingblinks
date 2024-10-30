import { NextRequest } from 'next/server'
import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ACTIONS_CORS_HEADERS, createPostResponse } from "@solana/actions"
import { Transaction, TransactionInstruction, PublicKey, ComputeBudgetProgram, Connection, clusterApiUrl } from "@solana/web3.js"
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from "@solana/spl-token"

const ACTION_URL = "https://nft.sickfreak.club/api/actions/cignft"
const ADDRESS = new PublicKey('rAhULHBrf2yGuANDuAGLuUTKuLCW17t86T8T6vGcuok')
const SEND_TOKEN_MINT = new PublicKey("SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa")
let SEND_AMOUNT = 16942 // Start at 6942 tokens
const INCREASE_PER_MINUTE = 10 // Increase by 10 tokens every minute

export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
icon:"https://nft.sickfreak.club/cignft.jpeg",
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


    const connection = new Connection(`https://mainnet.helius-rpc.com/?api-key=215399cd-1d50-4bdf-8637-021503ae6ef3`)

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
    
    transaction.feePayer = account
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `You have purchased cig nft only 1 in existence .`,
      },
    })

    // Increase SEND_AMOUNT by INCREASE_PER_MINUTE every minute
    setInterval(() => {
      SEND_AMOUNT += INCREASE_PER_MINUTE
    }, 60000)

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS })
  } catch (err) {
    console.error(err)
    return Response.json("An unknown error occurred", { status: 500 })
  }
}
