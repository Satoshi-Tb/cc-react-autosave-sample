import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
} from "@mui/material";
import useSWR, { mutate } from "swr";
import { useAutosaveBus } from "@/context/AutosaveContext";
import { apiClient } from "@/lib/apiClient";
import type { Item, Saver, SaveResult } from "@/lib/types";

interface ItemDetailFormContextProps {
  selectedId: string | null;
}

const ItemDetailFormContext: React.FC<ItemDetailFormContextProps> = ({
  selectedId,
}) => {
  const { register } = useAutosaveBus();
  const [localData, setLocalData] = useState<
    Partial<Pick<Item, "name" | "status" | "note">>
  >({});

  const { data: serverItem } = useSWR(
    selectedId ? ["item", selectedId] : null,
    () => apiClient.getItem(selectedId!),
    { revalidateOnFocus: false }
  );

  const displayItem = serverItem ? { ...serverItem, ...localData } : null;

  const isDirty = (): boolean => {
    if (!serverItem) return false;
    return (
      (localData.name !== undefined && localData.name !== serverItem.name) ||
      (localData.status !== undefined &&
        localData.status !== serverItem.status) ||
      (localData.note !== undefined && localData.note !== serverItem.note)
    );
  };

  const saverRef = useRef<Saver>(async () => "noop");

  useEffect(() => {
    saverRef.current = async (): Promise<SaveResult> => {
      if (!isDirty() || !selectedId || !serverItem) {
        return "noop";
      }

      try {
        const putData = {
          id: selectedId,
          name: localData.name ?? serverItem.name,
          status: localData.status ?? serverItem.status,
          note: localData.note ?? serverItem.note,
          version: serverItem.version,
        };

        await apiClient.putItem(selectedId, putData);

        setLocalData({});
        await mutate(["item", selectedId]);
        await mutate(["items"]);

        return "saved";
      } catch (error: any) {
        alert(`保存に失敗しました: ${error.message}`);
        return "failed";
      }
    };
  }, [selectedId, serverItem, localData, isDirty]);

  const stableSaver = useMemo(() => () => saverRef.current(), []);

  useEffect(() => {
    const dispose = register(stableSaver);
    return dispose;
  }, [register, stableSaver]);

  useEffect(() => {
    setLocalData({});
  }, [selectedId]);

  const handleChange =
    (field: keyof Pick<Item, "name" | "status" | "note">) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setLocalData((prev) => ({ ...prev, [field]: value }));
    };

  const handleSave = async () => {
    await saverRef.current();
  };

  if (!selectedId || !displayItem) {
    return <Box p={2}>アイテムを選択してください</Box>;
  }

  return (
    <Box p={2}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <h3>詳細フォーム (Context API) (ID: {selectedId})</h3>
        {isDirty() && <Chip label="Dirty" color="warning" size="small" />}
      </Box>

      <Box display="flex" flexDirection="column" gap={2}>
        <TextField
          label="Name"
          value={displayItem.name || ""}
          onChange={handleChange("name")}
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={displayItem.status || "A"}
            onChange={(e) =>
              handleChange("status")({
                target: { value: e.target.value },
              } as any)
            }
            label="Status"
          >
            <MenuItem value="A">A</MenuItem>
            <MenuItem value="B">B</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="Note"
          value={displayItem.note || ""}
          onChange={handleChange("note")}
          multiline
          rows={4}
          fullWidth
        />

        <Box display="flex" gap={1}>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ItemDetailFormContext;
