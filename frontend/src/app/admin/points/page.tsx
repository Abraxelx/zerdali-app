"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";

export default function AdminPointsPage() {
  const msg = useMessage();
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.getUsers("student") });
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const grant = async () => {
    if (!studentId || !amount) {
      msg.error("Eksik bilgi", "Öğrenci ve miktar seç.");
      return;
    }
    try {
      await api.grantPoints(studentId, parseInt(amount), description || "Admin bonus");
      msg.success(`${amount} Zerdalyum verildi`, "Öğrenciye bildirim gitti.");
      setAmount("");
      setDescription("");
    } catch (err) {
      showApiError(msg, err, "Puan verilemedi");
    }
  };

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Puan Yönetimi" subtitle="Manuel Zerdalyum ver" />
        <Card className="max-w-lg">
          <div className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-600">Öğrenci</span>
              <select className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Seçin</option>
                {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
            <Input label="Miktar" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Admin bonus" />
            <Button onClick={grant}>Puan Ver</Button>
          </div>
        </Card>
      </AppLayout>
    </AuthGuard>
  );
}
