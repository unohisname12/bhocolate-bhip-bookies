import type { Inventory, InventoryItem } from '../../types';

export const addItem = (inventory: Inventory, itemId: string, quantity: number): Inventory => {
  const existing = inventory.items.find((i) => i.itemId === itemId);
  if (existing) {
    return {
      ...inventory,
      items: inventory.items.map((i) =>
        i.itemId === itemId ? { ...i, quantity: i.quantity + quantity } : i,
      ),
    };
  }
  const newItem: InventoryItem = { itemId, quantity, acquiredAt: Date.now() };
  return { ...inventory, items: [...inventory.items, newItem] };
};

export const removeItem = (inventory: Inventory, itemId: string, quantity: number): Inventory => {
  const existing = inventory.items.find((i) => i.itemId === itemId);
  if (!existing) return inventory;
  const newQty = existing.quantity - quantity;
  if (newQty <= 0) {
    return { ...inventory, items: inventory.items.filter((i) => i.itemId !== itemId) };
  }
  return {
    ...inventory,
    items: inventory.items.map((i) => (i.itemId === itemId ? { ...i, quantity: newQty } : i)),
  };
};

export const hasItem = (inventory: Inventory, itemId: string): boolean =>
  inventory.items.some((i) => i.itemId === itemId && i.quantity > 0);

export const getItemCount = (inventory: Inventory, itemId: string): number =>
  inventory.items.find((i) => i.itemId === itemId)?.quantity ?? 0;
