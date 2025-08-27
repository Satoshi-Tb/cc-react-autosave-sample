import React, { useCallback, useState } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid, GridColDef, GridRowModel } from '@mui/x-data-grid';
import useSWR, { mutate } from 'swr';
import { useAutosaveBus } from '@/context/AutosaveContext';
import { apiClient } from '@/lib/apiClient';
import type { Item } from '@/lib/types';

interface PaneAContextProps {
  selectedId: string | null;
  onSelectedIdChange: (id: string | null) => void;
}

const PaneAContext: React.FC<PaneAContextProps> = ({ selectedId, onSelectedIdChange }) => {
  const { saveIfDirty } = useAutosaveBus();
  
  const { data: itemsResponse } = useSWR(
    ['items'],
    () => apiClient.getItems(),
    { revalidateOnFocus: false }
  );

  const items = itemsResponse?.data || [];

  const handleRowClick = useCallback(async (params: any) => {
    const canProceed = await saveIfDirty();
    if (canProceed) {
      onSelectedIdChange(params.id);
    }
  }, [saveIfDirty, onSelectedIdChange]);

  const handleProcessRowUpdate = useCallback(async (newRow: GridRowModel, oldRow: GridRowModel): Promise<GridRowModel> => {
    const canProceed = await saveIfDirty();
    if (!canProceed) {
      throw new Error('自動保存が失敗したため、編集をキャンセルしました');
    }

    try {
      const changes: Partial<Pick<Item, 'name' | 'status'>> = {};
      if (newRow.name !== oldRow.name) changes.name = newRow.name;
      if (newRow.status !== oldRow.status) changes.status = newRow.status;

      if (Object.keys(changes).length === 0) {
        return oldRow;
      }

      const updatedItem = await apiClient.patchItem(newRow.id, changes);
      await mutate(['items']);
      return updatedItem;
    } catch (error: any) {
      alert(`更新に失敗しました: ${error.message}`);
      throw error;
    }
  }, [saveIfDirty]);

  const handleRefresh = useCallback(async () => {
    const canProceed = await saveIfDirty();
    if (canProceed) {
      await mutate(['items']);
    }
  }, [saveIfDirty]);

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      editable: false,
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      editable: true,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      editable: true,
      type: 'singleSelect',
      valueOptions: ['A', 'B'],
    },
    {
      field: 'updatedAt',
      headerName: 'Updated At',
      width: 180,
      editable: false,
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
    },
    {
      field: 'version',
      headerName: 'Ver',
      width: 80,
      editable: false,
    },
  ];

  return (
    <Box p={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <h3>アイテム一覧 (Context API)</h3>
        <Button variant="outlined" onClick={handleRefresh}>
          再読み込み
        </Button>
      </Box>
      
      <Box height={400} width="100%">
        <DataGrid
          rows={items}
          columns={columns}
          getRowId={(row) => row.id}
          onRowClick={handleRowClick}
          processRowUpdate={handleProcessRowUpdate}
          selectionModel={selectedId ? [selectedId] : []}
          experimentalFeatures={{ newEditingApi: true }}
        />
      </Box>
    </Box>
  );
};

export default PaneAContext;