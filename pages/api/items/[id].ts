import type { NextApiRequest, NextApiResponse } from 'next';
import type { Item, ItemPatch, ItemPut } from '@/lib/types';

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

  const itemIndex = items.findIndex(item => item.id === id);
  
  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (req.method === 'GET') {
    res.status(200).json(items[itemIndex]);
  } else if (req.method === 'PATCH') {
    const patch: ItemPatch = req.body;
    const currentItem = items[itemIndex];
    
    if (patch.version !== currentItem.version) {
      return res.status(409).json({ error: 'Version conflict' });
    }
    
    const updatedItem: Item = {
      ...currentItem,
      ...patch,
      version: currentItem.version + 1,
      updatedAt: new Date().toISOString(),
    };
    
    items[itemIndex] = updatedItem;
    res.status(200).json(updatedItem);
  } else if (req.method === 'PUT') {
    const putData: ItemPut = req.body;
    const currentItem = items[itemIndex];
    
    if (putData.version !== currentItem.version) {
      return res.status(409).json({ error: 'Version conflict' });
    }
    
    const updatedItem: Item = {
      ...putData,
      version: currentItem.version + 1,
      updatedAt: new Date().toISOString(),
    };
    
    items[itemIndex] = updatedItem;
    res.status(200).json(updatedItem);
  } else {
    res.setHeader('Allow', ['GET', 'PATCH', 'PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}