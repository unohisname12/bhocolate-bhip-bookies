export interface InventoryItem {
  itemId: string;
  quantity: number;
  acquiredAt: number;
}

export interface Inventory {
  items: InventoryItem[];
  maxSlots: number;
}
