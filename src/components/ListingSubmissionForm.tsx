"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { getVehicleMaxAllowedYear } from "@/lib/siteSettings";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { getModelsForMake, vehicleMakes } from "@/lib/vehicleCatalog";

export default function ListingSubmissionForm() {
  const { settings, isReady } = useSiteSettings();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf");
  const [make, setMake] = useState<string>("");
  const [customMake, setCustomMake] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [yearManufacture, setYearManufacture] = useState<number | "">("");
  const [yearModel, setYearModel] = useState<number | "">("");
  const [photoCount, setPhotoCount] = useState(0);

  const maxAllowedYear = useMemo(
    () => getVehicleMaxAllowedYear(settings),
    [settings]
  );

  const models = useMemo(() => {
    if (!make || make === "Outro") return [];
    return getModelsForMake(make);
  }, [make]);

  const normalizedMake = (make === "Outro" ? customMake : make).trim();
  const normalizedModel = (model === "Outro" ? customModel : model).trim();

  const generatedTitle = useMemo(() => {
    const parts: string[] = [];
    if (normalizedMake) parts.push(normalizedMake);
    if (normalizedModel) parts.push(normalizedModel);

    if (typeof yearManufacture === "number" && typeof yearModel === "number") {
      parts.push(`${yearManufacture}/${yearModel}`);
    } else if (typeof yearModel === "number") {
      parts.push(String(yearModel));
    } else if (typeof yearManufacture === "number") {
      parts.push(String(yearManufacture));
    }

    return parts.join(" ");
  }, [normalizedMake, normalizedModel, yearManufacture, yearModel]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!generatedTitle.trim()) {
      setError("Preencha os dados do veículo para gerar o título automaticamente.");
      setSubmitted(false);
      return;
    }

    if (typeof yearManufacture === "number" && yearManufacture > maxAllowedYear) {
      setError(
        `Apenas veículos com ${settings.vehicleMinAgeYears}+ anos. Para este ano, o máximo permitido é ${maxAllowedYear}.`
      );
      setSubmitted(false);
      return;
    }

    if (typeof yearModel === "number" && yearModel > maxAllowedYear) {
      setError(
        `Apenas veículos com ${settings.vehicleMinAgeYears}+ anos. Para este ano, o máximo permitido é ${maxAllowedYear}.`
      );
      setSubmitted(false);
      return;
    }

    if (
      typeof yearManufacture === "number" &&
      yearManufacture < settings.vehicleModelYearMin
    ) {
      setError(`Ano de fabricação mínimo: ${settings.vehicleModelYearMin}.`);
      setSubmitted(false);
      return;
    }

    if (typeof yearModel === "number" && yearModel < settings.vehicleModelYearMin) {
      setError(`Ano-modelo mínimo: ${settings.vehicleModelYearMin}.`);
      setSubmitted(false);
      return;
    }

    if (photoCount > 10) {
      setError("Você pode enviar no máximo 10 fotos por anúncio.");
      setSubmitted(false);
      return;
    }

    setError(null);
    setSubmitted(true);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      {submitted ? (
        <Notice title="Anúncio enviado" variant="success">
          Protótipo: envio simulado. No sistema final, anúncios passam por aprovação e só ficam públicos após validação de e-mail.
        </Notice>
      ) : (
        <Notice title="Regras (planejado)" variant="info">
          Cadastro gratuito. Limites por documento: CPF até {settings.listingLimits.cpf} anúncios ativos, CNPJ até {settings.listingLimits.cnpj}. Apenas veículos com {settings.vehicleMinAgeYears}+ anos (ano máximo: {maxAllowedYear}). Até 10 fotos por anúncio.
        </Notice>
      )}

      {error ? (
        <Notice title="Validação" variant="warning">
          {error}
        </Notice>
      ) : null}

      {!isReady ? (
        <Notice title="Carregando" variant="info">
          Lendo configurações salvas.
        </Notice>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Tipo de documento</span>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={documentType}
            onChange={(e) => {
              setDocumentType(e.target.value as "cpf" | "cnpj");
              setError(null);
            }}
          >
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Documento (mock)</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            inputMode="numeric"
            placeholder={documentType === "cpf" ? "CPF" : "CNPJ"}
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Título do anúncio (automático)</span>
          <input
            required
            readOnly
            className="h-11 rounded-md border border-slate-300 bg-slate-50 px-3 text-sm"
            value={generatedTitle}
            placeholder="Preencha marca, modelo e ano para gerar"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Marca</span>
          <select
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={make}
            onChange={(e) => {
              const next = e.target.value;
              setMake(next);
              setModel("");
              setCustomMake("");
              setCustomModel("");
              setError(null);
            }}
          >
            <option value="">Selecione</option>
            {vehicleMakes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="Outro">Outro</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Modelo</span>
          <select
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setCustomModel("");
              setError(null);
            }}
            disabled={!make}
          >
            <option value="">Selecione</option>
            {models.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
            <option value="Outro">Outro</option>
          </select>
        </label>

        {make === "Outro" ? (
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Marca (Outro)</span>
            <input
              required
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              placeholder="Digite a marca"
              value={customMake}
              onChange={(e) => {
                setCustomMake(e.target.value);
                setError(null);
              }}
            />
          </label>
        ) : null}

        {make === "Outro" || model === "Outro" ? (
          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-semibold text-slate-900">Modelo (Outro)</span>
            <input
              required
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              placeholder="Digite o modelo"
              value={customModel}
              onChange={(e) => {
                setCustomModel(e.target.value);
                setError(null);
              }}
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Ano de fabricação</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="number"
            inputMode="numeric"
            min={settings.vehicleModelYearMin}
            max={maxAllowedYear}
            placeholder="1978"
            value={yearManufacture}
            onChange={(e) => {
              const value = e.target.value;
              setYearManufacture(value ? Number(value) : "");
              setError(null);
            }}
          />
          <span className="text-xs text-slate-500">
            Somente até {maxAllowedYear} ({settings.vehicleMinAgeYears}+ anos)
          </span>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Ano do modelo</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="number"
            inputMode="numeric"
            min={settings.vehicleModelYearMin}
            max={maxAllowedYear}
            placeholder="1979"
            value={yearModel}
            onChange={(e) => {
              const value = e.target.value;
              setYearModel(value ? Number(value) : "");
              setError(null);
            }}
          />
          <span className="text-xs text-slate-500">Mínimo: {settings.vehicleModelYearMin}</span>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Quilometragem (km)</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="123456"
            onChange={() => setError(null)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Único dono</span>
          <select
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            defaultValue="no"
            onChange={() => setError(null)}
          >
            <option value="no">Não</option>
            <option value="yes">Sim</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Placa preta</span>
          <select
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            defaultValue="no"
            onChange={() => setError(null)}
          >
            <option value="no">Não</option>
            <option value="yes">Sim</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Carro de leilão</span>
          <select
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            defaultValue="no"
            onChange={() => setError(null)}
          >
            <option value="no">Não</option>
            <option value="yes">Sim</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">IPVA pago</span>
          <select
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            defaultValue="yes"
            onChange={() => setError(null)}
          >
            <option value="yes">Sim</option>
            <option value="no">Não</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Quitado ou alienado</span>
          <select
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            defaultValue="quitado"
            onChange={() => setError(null)}
          >
            <option value="quitado">Quitado</option>
            <option value="alienado">Alienado</option>
          </select>
        </label>

        <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-slate-900">Placa</span>
            <input
              required
              className="h-11 rounded-md border border-slate-300 px-3 text-sm"
              placeholder="ABC1D23"
              onChange={() => setError(null)}
            />
          </label>

          <label className="mt-7 inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              onChange={() => setError(null)}
            />
            Exibir placa no anúncio
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Preço</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="number"
            placeholder="79000"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Cidade</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Cidade"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">UF</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="SP"
            maxLength={2}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Telefone para contato</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="(11) 99999-9999"
            type="tel"
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Descrição</span>
          <textarea
            required
            className="min-h-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Descreva estado geral, histórico, detalhes de mecânica/funilaria e documentação."
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Fotos (mock)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              const files = e.target.files;
              setPhotoCount(files?.length ?? 0);
              setError(null);
            }}
          />
          <span className="text-xs text-slate-500">
            No sistema final: até 10 fotos, conversão automática para WEBP, lazy load e tamanhos 480/960/1600.
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Enviar anúncio para aprovação
      </button>
    </form>
  );
}
