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
import { formatNumber } from "@/lib/format";
import type { Usuario } from "@/lib/types";

type Tab = "datos" | "postulaciones" | "documentos";

function Perfil({ user }: { user: Usuario }) {
  const params = useSearchParams();
  const initial = (params.get("tab") as Tab) || "datos";
  const [tab, setTab] = useState<Tab>(["datos", "postulaciones", "documentos"].includes(initial) ? initial : "datos");
  const ubicacion = [user.comuna, user.region].filter(Boolean).join(", ");

  return (
    <>
      <section className="relative overflow-clip bg-tinta text-papel">
        <div className="mx-auto flex max-w-7xl flex-col justify-end px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid gap-x-8 gap-y-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <Avatar
                name={`${user.nombre} ${user.apellido}`}
                src={user.tiene_foto ? fileUrl.foto(user.id, user.foto_version) : null}
                size={88}
                className="hero-sigue mb-7 ring-2 ring-papel/40"
              />
              <h1 className="font-display text-[clamp(2.4rem,1.4rem+3.4vw,4.5rem)] leading-[0.95] tracking-[-0.03em]">
                <span className="linea">
                  <span>{user.nombre}</span>
                </span>
                <span className="linea">
                  <span>{user.apellido}</span>
                </span>
              </h1>
              <div className="hero-sigue mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-papel/75">
                <Badge className="bg-papel/15 text-papel ring-papel/30">{ROL_LABEL[user.rol]}</Badge>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> {user.email}
                </span>
                {ubicacion && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {ubicacion}
                  </span>
                )}
              </div>
            </div>
            <div className="cifra-banda lg:col-span-4 lg:justify-self-end" style={{ "--i": 2 } as React.CSSProperties}>
              <p className="flex items-baseline gap-2 font-display text-[clamp(3rem,1.8rem+4vw,5.5rem)] leading-none tracking-[-0.03em] text-ambar">
                {formatNumber(user.horas_voluntariado)}
                <span className="text-[0.32em] font-semibold uppercase tracking-[0.08em] text-papel/60">h</span>
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-papel/70">
                <Clock className="h-4 w-4" /> horas de voluntariado
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:-mt-14 lg:px-8">
        <div className="hero-sigue rounded-2xl bg-papel p-2 shadow-[0_30px_70px_-30px_rgb(15_27_45/0.55)] ring-[1.5px] ring-tinta/10">
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
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {tab === "datos" && <DatosTab user={user} />}
        {tab === "postulaciones" && <PostulacionesTab user={user} />}
        {tab === "documentos" && <DocumentosTab user={user} />}
      </div>
    </>
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
