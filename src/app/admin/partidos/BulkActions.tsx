"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Stage } from "@/generated/prisma/client";
import { bulkToggleStage, bulkSetPrice } from "./actions";

export function BulkActions({ stage, label, matchIds }: { stage: Stage; label: string; matchIds?: string[] }) {
  const [price, setPrice] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setLoading(true);
    await bulkToggleStage(stage, true, matchIds);
    setLoading(false);
  }

  async function handleClose() {
    setLoading(true);
    await bulkToggleStage(stage, false, matchIds);
    setLoading(false);
  }

  async function handlePrice() {
    if (!price) return;
    setLoading(true);
    await bulkSetPrice(stage, parseFloat(price), matchIds);
    setLoading(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-gray-50 rounded-lg border text-sm">
      <span className="text-gray-500 font-medium mr-1">Todos en {label}:</span>
      <Button size="sm" variant="outline" onClick={handleOpen} disabled={loading}
        className="h-7 text-xs text-green-700 border-green-300">
        Abrir todos
      </Button>
      <Button size="sm" variant="outline" onClick={handleClose} disabled={loading}
        className="h-7 text-xs text-red-700 border-red-300">
        Cerrar todos
      </Button>
      <div className="flex items-center gap-1 ml-2">
        <Input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio uniforme"
          className="h-7 w-36 text-xs"
        />
        <Button size="sm" variant="outline" onClick={handlePrice} disabled={loading || !price}
          className="h-7 text-xs">
          Aplicar
        </Button>
      </div>
    </div>
  );
}
