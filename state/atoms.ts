import { atom, atomFamily } from "recoil";
import type { Item } from "@/lib/types";

export const selectedIdAtom = atom<string | null>({
  key: "selectedId",
  default: null,
});

export const draftByIdAtomFamily = atomFamily<
  Partial<Item> | undefined,
  string
>({
  key: "draftById",
  default: undefined,
});
