import { fetcher } from "./fetcher";
import type { Item, ItemPatch, ItemPut } from "./types";

export const apiClient = {
  async getItems(): Promise<{ data: Item[] }> {
    return fetcher("/api/items");
  },

  async getItem(id: string): Promise<Item> {
    return fetcher(`/api/items/${id}`);
  },

  async patchItem(id: string, patch: ItemPatch): Promise<Item> {
    return fetcher(`/api/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async putItem(id: string, item: ItemPut): Promise<Item> {
    return fetcher(`/api/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  },

  async bumpVersion(id: string): Promise<Item> {
    return fetcher(`/api/items/${id}/bump-version`, {
      method: "POST",
    });
  },
};
