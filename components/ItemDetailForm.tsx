import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import { Box, TextField, Select, MenuItem, FormControl, InputLabel, Button, Chip } from '@mui/material';
import { useRecoilState, useRecoilValue } from 'recoil';
import useSWR, { mutate } from 'swr';
import { selectedIdAtom, draftByIdAtomFamily } from '@/state/atoms';
import { apiClient } from '@/lib/apiClient';
import type { DetailFormHandle, AutoSaveReason, Item } from '@/lib/types';

const ItemDetailForm = forwardRef<DetailFormHandle>((_, ref) => {
  const selectedId = useRecoilValue(selectedIdAtom);
  const [draft, setDraft] = useRecoilState(draftByIdAtomFamily(selectedId || ''));
  const inFlightRef = useRef<Promise<"saved" | "noop" | "failed" | "conflict"> | null>(null);

  const { data: serverItem } = useSWR(
    selectedId ? ['item', selectedId] : null,
    () => apiClient.getItem(selectedId!),
    { revalidateOnFocus: false }
  );

  const displayItem = serverItem ? { ...serverItem, ...draft } : null;

  const isDirty = useCallback((): boolean => {
    if (!serverItem || !draft) return false;
    return (
      (draft.name !== undefined && draft.name !== serverItem.name) ||
      (draft.status !== undefined && draft.status !== serverItem.status) ||
      (draft.note !== undefined && draft.note !== serverItem.note)
    );
  }, [serverItem, draft]);

  const saveIfDirty = useCallback(async (reason: AutoSaveReason) => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    if (!isDirty() || !selectedId || !serverItem) {
      return 'noop' as const;
    }

    const promise = (async () => {
      try {
        const putData = {
          id: selectedId,
          name: draft?.name ?? serverItem.name,
          status: draft?.status ?? serverItem.status,
          note: draft?.note ?? serverItem.note,
          version: serverItem.version,
        };

        await apiClient.putItem(selectedId, putData);
        
        setDraft(undefined);
        await mutate(['item', selectedId]);
        await mutate(['items']);
        
        return 'saved' as const;
      } catch (error: any) {
        if (error.status === 409) {
          alert('競合が発生しました');
          return 'conflict' as const;
        } else {
          alert(`保存に失敗しました: ${error.message}`);
          return 'failed' as const;
        }
      }
    })();

    inFlightRef.current = promise;
    const result = await promise;
    inFlightRef.current = null;
    
    return result;
  }, [selectedId, serverItem, draft, isDirty, setDraft]);

  useImperativeHandle(ref, () => ({
    saveIfDirty,
    isDirty,
  }), [saveIfDirty, isDirty]);

  const handleChange = (field: keyof Pick<Item, 'name' | 'status' | 'note'>) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await saveIfDirty('A_REFETCH');
  };

  if (!selectedId || !displayItem) {
    return <Box p={2}>アイテムを選択してください</Box>;
  }

  return (
    <Box p={2}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <h3>詳細フォーム (ID: {selectedId})</h3>
        {isDirty() && <Chip label="Dirty" color="warning" size="small" />}
      </Box>
      
      <Box display="flex" flexDirection="column" gap={2}>
        <TextField
          label="Name"
          value={displayItem.name || ''}
          onChange={handleChange('name')}
          fullWidth
        />
        
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={displayItem.status || 'A'}
            onChange={(e) => handleChange('status')({ target: { value: e.target.value } } as any)}
            label="Status"
          >
            <MenuItem value="A">A</MenuItem>
            <MenuItem value="B">B</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          label="Note"
          value={displayItem.note || ''}
          onChange={handleChange('note')}
          multiline
          rows={4}
          fullWidth
        />
        
        <Box display="flex" gap={1}>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
          <Button 
            variant="outlined"
            onClick={() => apiClient.bumpVersion(selectedId)}
          >
            競合を発生させる
          </Button>
        </Box>
      </Box>
    </Box>
  );
});

ItemDetailForm.displayName = 'ItemDetailForm';

export default ItemDetailForm;