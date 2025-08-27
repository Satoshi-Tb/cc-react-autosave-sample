export type Item = {
  id: string;
  name: string;
  status: "A" | "B";
  note?: string;
  updatedAt: string;
  version: number;
};

export type ItemPatch = Partial<Pick<Item, "name" | "status" | "note">>;

export type ItemPut = Pick<Item, "id" | "name" | "status" | "note" | "version">;

export type AutoSaveReason = "A_SELECT" | "A_EDIT_COMMIT" | "A_REFETCH";

export type DetailFormHandle = {
  saveIfDirty: (
    reason: AutoSaveReason
  ) => Promise<"saved" | "noop" | "failed" | "conflict">;
  isDirty: () => boolean;
};

// Context API types
export type SaveResult = "saved" | "noop" | "failed";
export type Saver = () => Promise<SaveResult>;

export type AutosaveCtx = {
  /** 画面Bが保存関数を登録し、解除関数を受け取る（必ずクリーンアップで呼ぶ） */
  register: (saver: Saver) => () => void;
  /** 画面Aが保存を要求：true=続行OK / false=中断 */
  saveIfDirty: () => Promise<boolean>;
};