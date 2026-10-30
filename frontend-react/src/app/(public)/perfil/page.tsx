"use client";

import { Clock, Mail, MapPin } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import DatosTab from "@/components/perfil/DatosTab";
import DocumentosTab from "@/components/perfil/DocumentosTab";
import PostulacionesTab from "@/components/perfil/PostulacionesTab";
import { Avatar, Badge, Tabs } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { ROL_LABEL } from "@/lib/constants";
import { formatNumber, fullName } from "@/lib/format";
import type { Usuario } from "@/lib/types";

type Tab = "datos" | "postulaciones" | "documentos";

function Perfil({ user }: { user: Usuario }) {
  const params = useSearchParams();
  const initial = (params.get("tab") as Tab) || "datos";
  const [tab, setTab] = useState<Tab>(["datos", "postulaciones", "documentos"].includes(initial) ? initial : "datos");
  const ubicacion = [user.comuna, user.region].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start gap-5 rounded-3xl bg-gradient-to-br from-brand-dark to-brand p-6 text-white sm:flex-row sm:items-center sm:p-8">
        <Avatar name={fullName(user)} src={user.tiene_foto ? fileUrl.foto(user.id, user.foto_version) : null} size={80} className="ring-4 ring-white/30" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{fullName(user)}</h1>
            <Badge tone="blue" className="bg-white/15 text-white ring-white/30">
              {ROL_LABEL[user.rol]}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> {user.email}
            </span>
            {ubicacion && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {ubicacion}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {formatNumber(user.horas_voluntariado)} horas de voluntariado
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "datos", label: "Mis datos" },
            { value: "postulaciones", label: "Mis postulaciones" },
            { value: "documentos", label: "Mis documentos" },
          ]}
        />
      </div>
      {tab === "datos" && <DatosTab user={user} />}
      {tab === "postulaciones" && <PostulacionesTab user={user} />}
      {tab === "documentos" && <DocumentosTab user={user} />}
    </div>
  );
}

export default function PerfilPage() {
  return (
    <RequireAuth roles={["user"]}>
      {(user) => (
        <Suspense>
          <Perfil user={user} />
        </Suspense>
      )}
    </RequireAuth>
  );
}
