/* eslint-disable no-restricted-syntax */
import { NextApiRequest, NextApiResponse } from 'next/types';
import type { Socket as NetSocket } from 'net';
import type { Server as IOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';

type TxData = {
  accounts: string[];
};

interface SocketServer extends HTTPServer {
  io: IOServer | undefined
}

interface SocketWithIO extends NetSocket {
  server: SocketServer
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO
}

interface TransferTransaction {
  accountData: {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: never[];
  }[];
  description: string;
  events: Record<string, never>;
  fee: number;
  feePayer: string;
  instructions: {
    accounts: string[];
    data: string;
    innerInstructions:
    {
      accounts: string[];
      data: string;
      programId: string;
    }[],
    programId: string;
  }[];
  nativeTransfers: {
    amount: number;
    fromUserAccount: string;
    toUserAccount: string;
  }[];
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers: never[];
  transactionError: null;
  type: string;
}

async function post(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { headers } = req;
  const { authorization } = headers;

  if (authorization !== process.env.HELIUS_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'access denied' });
  }

  const { body } = req;
  const json : TransferTransaction[] = body;
  await fetch(`https://${process.env.DOMAIN_URL}/api/socket`);

  for (const tx of json) {
    for (const element of tx.instructions) {
      const data: TxData = {
        accounts: element.accounts,
      };
      res.socket.server.io?.emit('tx', data);
    }
  }

  return res.status(200).json({ success: true });
}

export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.method === 'POST') {
    return post(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
