import type { NextApiRequest, NextApiResponse } from 'next';
import type { Item } from '@/lib/types';

const items: Item[] = [
  {
    id: '1',
    name: 'Item 1',
    status: 'A',
    note: 'First item note',
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: '2',
    name: 'Item 2',
    status: 'B',
    note: 'Second item note',
    updatedAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: '3',
    name: 'Item 3',
    status: 'A',
    note: '',
    updatedAt: new Date().toISOString(),
    version: 1,
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ data: Item[] }>
) {
  if (req.method === 'GET') {
    res.status(200).json({ data: items });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}