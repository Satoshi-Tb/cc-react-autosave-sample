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
  res: NextApiResponse<Item | { error: string }>
) {
  const { id } = req.query;
  
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (req.method === 'POST') {
    const itemIndex = items.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentItem = items[itemIndex];
    const updatedItem: Item = {
      ...currentItem,
      version: currentItem.version + 1,
      updatedAt: new Date().toISOString(),
    };
    
    items[itemIndex] = updatedItem;
    res.status(200).json(updatedItem);
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}