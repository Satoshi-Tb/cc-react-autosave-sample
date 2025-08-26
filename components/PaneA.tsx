import React, { useCallback } from 'react';
import { Box, Button } from '@mui/material';
import { DataGrid, GridColDef, GridRowModel, GridRowModesModel } from '@mui/x-data-grid';
import { useRecoilState } from 'recoil';
import useSWR, { mutate } from 'swr';
import { selectedIdAtom } from '@/state/atoms';
import { apiClient } from '@/lib/apiClient';
import type { Item, AutoSaveReason } from '@/lib/types';

interface PaneAProps {
  autoSaveGate: (reason: AutoSaveReason) => Promise<boolean>;
}

const PaneA: React.FC<PaneAProps> = ({ autoSaveGate }) => {
  const [selectedId, setSelectedId] = useRecoilState(selectedIdAtom);
  
  const { data: itemsResponse } = useSWR(
    ['items'],
    () => apiClient.getItems(),
    { revalidateOnFocus: false }
  );

  const items = itemsResponse?.data || [];

  const handleRowClick = useCallback(async (params: any) => {
    const canProceed = await autoSaveGate('A_SELECT');
    if (canProceed) {
      setSelectedId(params.id);
    }
  }, [autoSaveGate, setSelectedId]);

  const handleProcessRowUpdate = useCallback(async (newRow: GridRowModel, oldRow: GridRowModel): Promise<GridRowModel> => {
    const canProceed = await autoSaveGate('A_EDIT_COMMIT');
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

      const updatedItem = await apiClient.patchItem(newRow.id, {
        ...changes,
        version: oldRow.version,
      });

      await mutate(['items']);
      return updatedItem;
    } catch (error: any) {
      if (error.status === 409) {
        alert('競合が発生しました');
      } else {
        alert(`更新に失敗しました: ${error.message}`);
      }
      throw error;
    }
  }, [autoSaveGate]);

  const handleRefresh = useCallback(async () => {
    const canProceed = await autoSaveGate('A_REFETCH');
    if (canProceed) {
      await mutate(['items']);
    }
  }, [autoSaveGate]);

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
        <h3>アイテム一覧</h3>
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

export default PaneA;