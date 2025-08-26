export type Item = {
  id: string;
  name: string;
  status: "A" | "B";
  note?: string;
  updatedAt: string;
  version: number;
};

export type ItemPatch = Partial<Pick<Item, "name" | "status" | "note">> & {
  version: number;
};

export type ItemPut = Pick<Item, "id" | "name" | "status" | "note" | "version">;

export type AutoSaveReason = "A_SELECT" | "A_EDIT_COMMIT" | "A_REFETCH";

export type DetailFormHandle = {
  saveIfDirty: (
    reason: AutoSaveReason
  ) => Promise<"saved" | "noop" | "failed" | "conflict">;
  isDirty: () => boolean;
};