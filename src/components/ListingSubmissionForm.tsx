"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { validateCNPJ, validateCPF } from "@/lib/document";
import { getVehicleMaxAllowedYear } from "@/lib/siteSettings";
import { useAuth } from "@/lib/useAuth";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { getModelsForMake, vehicleMakes } from "@/lib/vehicleCatalog";
import type { VehicleBrand } from "@/lib/database";

export default function ListingSubmissionForm() {
  const { settings, isReady } = useSiteSettings();
  const { user, token } = useAuth();

  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf");
  const [documentValue, setDocumentValue] = useState("");

  const [make, setMake] = useState<string>("");
  const [customMake, setCustomMake] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");

  const [yearManufacture, setYearManufacture] = useState<number | "">("");
  const [yearModel, setYearModel] = useState<number | "">("");
  const [mileage, setMileage] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">("");

  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");

  const [photoCount, setPhotoCount] = useState(0);

  const maxAllowedYear = useMemo(
    () => getVehicleMaxAllowedYear(settings),
    [settings]
  );

  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await fetch("/api/catalog/brands");
        const data = await response.json();
        if (Array.isArray(data.brands) && data.brands.length > 0) {
          setBrands(data.brands);
          setMake((current) => current || data.brands[0]?.id || "");
          return;
        }
        throw new Error("Catalogo vazio");
      } catch {
        const fallback = vehicleMakes.map((name) => ({
          id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          name,
          models: getModelsForMake(name)
        }));
        setBrands(fallback);
        setMake((current) => current || fallback[0]?.id || "");
      } finally {
        setCatalogLoading(false);
      }
    };

    loadBrands();
  }, []);

  const selectedBrand = useMemo(
    () => brands.find((brand) => brand.id === make),
    [brands, make]
  );

  const models = useMemo(() => {
    if (!make || make === "Outro") return [];
    return selectedBrand?.models ?? [];
  }, [make, selectedBrand]);

  const normalizedMake = (make === "Outro" ? customMake : selectedBrand?.name || "").trim();
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

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!token) {
      setError("Faca login para publicar o classificado.");
      setSubmitted(false);
      return;
    }

    if (!generatedTitle.trim()) {
      setError("Preencha marca, modelo e anos para gerar o titulo.");
      setSubmitted(false);
      return;
    }

    if (typeof yearManufacture !== "number" || typeof yearModel !== "number") {
      setError("Informe anos de fabricacao e modelo.");
      setSubmitted(false);
      return;
    }

    if (yearManufacture > maxAllowedYear || yearModel > maxAllowedYear) {
      setError(
        `Apenas veiculos com ${settings.vehicleMinAgeYears}+ anos. Maximo permitido: ${maxAllowedYear}.`
      );
      setSubmitted(false);
      return;
    }

    if (
      yearManufacture < settings.vehicleModelYearMin ||
      yearModel < settings.vehicleModelYearMin
    ) {
      setError(`Ano minimo permitido: ${settings.vehicleModelYearMin}.`);
      setSubmitted(false);
      return;
    }

    if (typeof mileage !== "number" || mileage < 0) {
      setError("Informe uma quilometragem valida.");
      setSubmitted(false);
      return;
    }

    if (typeof price !== "number" || price <= 0) {
      setError("Informe um preco valido.");
      setSubmitted(false);
      return;
    }

    if (!city.trim() || !stateUf.trim()) {
      setError("Informe cidade e UF.");
      setSubmitted(false);
      return;
    }

    if (!contactPhone.trim()) {
      setError("Informe telefone para contato.");
      setSubmitted(false);
      return;
    }

    if (!description.trim()) {
      setError("Informe a descricao.");
      setSubmitted(false);
      return;
    }

    if (photoCount > 10) {
      setError("Voce pode enviar no maximo 10 fotos por anuncio.");
      setSubmitted(false);
      return;
    }

    if (user?.role !== "admin") {
      const validDocument =
        documentType === "cpf"
          ? validateCPF(documentValue)
          : validateCNPJ(documentValue);

      if (!validDocument) {
        setError(documentType === "cpf" ? "CPF invalido." : "CNPJ invalido.");
        setSubmitted(false);
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        make: normalizedMake,
        model: normalizedModel,
        modelYear: yearModel,
        manufactureYear: yearManufacture,
        year: yearModel,
        mileage,
        price,
        city: city.trim(),
        state: stateUf.trim().toUpperCase(),
        description: description.trim(),
        document: documentValue.trim(),
        contact: {
          name: contactName.trim() || user?.name || "Anunciante",
          email: contactEmail.trim(),
          phone: contactPhone.trim()
        },
        images: [],
        status: user?.role === "admin" ? "active" : undefined
      };

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erro ao publicar classificado.");
      }

      setSubmitted(true);
      setSuccessMessage(
        data.message ||
          (user?.role === "admin"
            ? "Classificado publicado com sucesso."
            : "Classificado enviado com sucesso.")
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Erro ao publicar classificado."
      );
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      {submitted ? (
        <Notice title="Classificado enviado" variant="success">
          {successMessage || "Classificado processado com sucesso."}
        </Notice>
      ) : (
        <Notice title="Regras" variant="info">
          Cadastro gratuito. Limites por documento: CPF ate {settings.listingLimits.cpf} anuncios ativos, CNPJ ate {settings.listingLimits.cnpj}. Apenas veiculos com {settings.vehicleMinAgeYears}+ anos (ano maximo: {maxAllowedYear}).
        </Notice>
      )}

      {error ? (
        <Notice title="Validacao" variant="warning">
          {error}
        </Notice>
      ) : null}

      {!isReady ? (
        <Notice title="Carregando" variant="info">
          Lendo configuracoes salvas.
        </Notice>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Tipo de documento</span>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            value={documentType}
            onChange={(event) => {
              setDocumentType(event.target.value as "cpf" | "cnpj");
              setError(null);
            }}
          >
            <option value="cpf">CPF</option>
            <option value="cnpj">CNPJ</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">
            Documento {user?.role === "admin" ? "(opcional para admin)" : ""}
          </span>
          <input
            required={user?.role !== "admin"}
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            inputMode="numeric"
            placeholder={documentType === "cpf" ? "CPF" : "CNPJ"}
            value={documentValue}
            onChange={(event) => {
              setDocumentValue(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Titulo do anuncio (automatico)</span>
          <input
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
            disabled={catalogLoading}
            onChange={(event) => {
              const next = event.target.value;
              setMake(next);
              setModel("");
              setCustomMake("");
              setCustomModel("");
              setError(null);
            }}
          >
            <option value="">{catalogLoading ? "Carregando catalogo..." : "Selecione"}</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
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
            onChange={(event) => {
              setModel(event.target.value);
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
              onChange={(event) => {
                setCustomMake(event.target.value);
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
              onChange={(event) => {
                setCustomModel(event.target.value);
                setError(null);
              }}
            />
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Ano de fabricacao</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="number"
            inputMode="numeric"
            min={settings.vehicleModelYearMin}
            max={maxAllowedYear}
            placeholder="1978"
            value={yearManufacture}
            onChange={(event) => {
              const value = event.target.value;
              setYearManufacture(value ? Number(value) : "");
              setError(null);
            }}
          />
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
            onChange={(event) => {
              const value = event.target.value;
              setYearModel(value ? Number(value) : "");
              setError(null);
            }}
          />
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
            value={mileage}
            onChange={(event) => {
              const value = event.target.value;
              setMileage(value ? Number(value) : "");
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Preco</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="number"
            step="0.01"
            min={0}
            placeholder="79000"
            value={price}
            onChange={(event) => {
              const value = event.target.value;
              setPrice(value ? Number(value) : "");
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Cidade</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Cidade"
            value={city}
            onChange={(event) => {
              setCity(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">UF</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="SP"
            maxLength={2}
            value={stateUf}
            onChange={(event) => {
              setStateUf(event.target.value.toUpperCase());
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Nome para contato</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Seu nome"
            value={contactName}
            onChange={(event) => {
              setContactName(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Telefone para contato</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="(11) 99999-9999"
            type="tel"
            value={contactPhone}
            onChange={(event) => {
              setContactPhone(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">E-mail para contato (opcional)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            placeholder="contato@exemplo.com"
            type="email"
            value={contactEmail}
            onChange={(event) => {
              setContactEmail(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Descricao</span>
          <textarea
            required
            className="min-h-32 rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Descreva estado geral, historico e documentacao."
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-semibold text-slate-900">Fotos (mock)</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="file"
            multiple
            accept="image/*"
            onChange={(event) => {
              const files = event.target.files;
              setPhotoCount(files?.length ?? 0);
              setError(null);
            }}
          />
          <span className="text-xs text-slate-500">
            No backend atual as imagens do formulario publico ainda nao sao enviadas.
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting
          ? "Publicando..."
          : user?.role === "admin"
            ? "Publicar classificado (admin)"
            : "Enviar classificado"}
      </button>
    </form>
  );
}
