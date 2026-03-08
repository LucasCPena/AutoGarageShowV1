"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import Notice from "@/components/Notice";
import { onlyDigits, validateCNPJ, validateCPF } from "@/lib/document";
import { getVehicleMaxAllowedYear } from "@/lib/siteSettings";
import { useAuth } from "@/lib/useAuth";
import { useSiteSettings } from "@/lib/useSiteSettings";
import { getModelsForMake, vehicleMakes } from "@/lib/vehicleCatalog";
import type { VehicleBrand } from "@/lib/database";


type ListingPhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
};

function formatDocumentInput(value: string, type: "cpf" | "cnpj") {
  const digits = onlyDigits(value).slice(0, type === "cpf" ? 11 : 14);

  if (type === "cpf") {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhoneInput(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatIntegerInput(value: string) {
  const digits = onlyDigits(value).replace(/^0+(?=\d)/, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseFormattedInteger(value: string) {
  const digits = onlyDigits(value);
  return digits ? Number(digits) : Number.NaN;
}

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
  const [mileage, setMileage] = useState("");
  const [price, setPrice] = useState("");

  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [description, setDescription] = useState("");

  const [photos, setPhotos] = useState<ListingPhotoItem[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(null);
  

  const maxAllowedYear = useMemo(
    () => getVehicleMaxAllowedYear(settings),
    [settings]
  );


  useEffect(() => {
    return () => {
      photos.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [photos]);

  function onPhotoFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    setError(null);

    setPhotos((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));

      const next = files.slice(0, 10).map((file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        previewUrl: URL.createObjectURL(file)
      }));

      setCoverPhotoId(next[0]?.id ?? null);
      return next;
    });
  }

  function movePhoto(photoId: string, direction: -1 | 1) {
    setPhotos((current) => {
      const index = current.findIndex((item) => item.id === photoId);
      if (index < 0) return current;
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  function removePhoto(photoId: string) {
    setPhotos((current) => {
      const item = current.find((entry) => entry.id === photoId);
      if (item) URL.revokeObjectURL(item.previewUrl);

      const next = current.filter((entry) => entry.id !== photoId);
      setCoverPhotoId((selected) => {
        if (selected && next.some((entry) => entry.id === selected)) return selected;
        return next[0]?.id ?? null;
      });
      return next;
    });
  }

  


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

  async function uploadListingImages(files: File[]) {
    const uploadedUrls = await Promise.all(
      files.map(async (file, index) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "listing");
        if (generatedTitle.trim()) {
          formData.append("alt", `${generatedTitle.trim()} foto ${index + 1}`);
        }

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData
        });

        const data = await response.json();
        if (!response.ok || typeof data.url !== "string" || !data.url.trim()) {
          throw new Error(
            data?.error || `Erro ao enviar imagem (${file.name}).`
          );
        }

        return data.url.trim();
      })
    );

    return uploadedUrls;
  }

  

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

    const mileageValue = parseFormattedInteger(mileage);
    if (!Number.isFinite(mileageValue) || mileageValue < 0) {
      setError("Informe uma quilometragem valida.");
      setSubmitted(false);
      return;
    }

    const priceValue = parseFormattedInteger(price);
    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setError("Informe um preco valido.");
      setSubmitted(false);
      return;
    }

    if (!city.trim() || !stateUf.trim()) {
      setError("Informe cidade e UF.");
      setSubmitted(false);
      return;
    }

    const phoneDigits = onlyDigits(contactPhone);
    if (phoneDigits.length < 10) {
      setError("Informe telefone para contato.");
      setSubmitted(false);
      return;
    }

    if (!description.trim()) {
      setError("Informe a descricao.");
      setSubmitted(false);
      return;
    }

    if (photos.length > 10) {
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
      const orderedFiles = photos.map((item) => item.file);
      const uploadedImages = orderedFiles.length > 0 ? await uploadListingImages(orderedFiles) : [];

      

      const selectedCoverIndex = coverPhotoId
        ? photos.findIndex((item) => item.id === coverPhotoId)
        : 0;

      const normalizedCoverIndex =
        selectedCoverIndex >= 0 && selectedCoverIndex < uploadedImages.length
          ? selectedCoverIndex
          : 0;

      const orderedImages = uploadedImages.length
        ? [
            uploadedImages[normalizedCoverIndex],
            ...uploadedImages.filter((_, index) => index !== normalizedCoverIndex)
          ]
        : [];

      const payload = {
        make: normalizedMake,
        model: normalizedModel,
        modelYear: yearModel,
        manufactureYear: yearManufacture,
        year: yearModel,
        mileage: mileageValue,
        price: priceValue,
        city: city.trim(),
        state: stateUf.trim().toUpperCase(),
        description: description.trim(),
        document: documentValue.trim(),
        contact: {
          name: contactName.trim() || user?.name || "Anunciante",
          email: contactEmail.trim(),
          phone: contactPhone.trim()
        },
        images: orderedImages,
        specifications: {
          singleOwner: false,
          blackPlate: false,
          showPlate: true,
          auctionVehicle: false,
          ipvaPaid: false,
          vehicleStatus: "paid"
        },
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
      const successText =
        data.message ||
          (user?.role === "admin"
            ? "Classificado publicado com sucesso."
            : "Classificado enviado com sucesso.");
      setSuccessMessage(successText);
      if (typeof window !== "undefined") {
        window.alert(successText);
      }
      photos.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setPhotos([]);
      setCoverPhotoId(null);
      
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
              const nextType = event.target.value as "cpf" | "cnpj";
              setDocumentType(nextType);
              setDocumentValue((current) => formatDocumentInput(current, nextType));
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
              setDocumentValue(formatDocumentInput(event.target.value, documentType));
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
            type="text"
            inputMode="numeric"
            placeholder="123.456"
            value={mileage}
            onChange={(event) => {
              setMileage(formatIntegerInput(event.target.value));
              setError(null);
            }}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-slate-900">Preco</span>
          <input
            required
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
            type="text"
            inputMode="numeric"
            placeholder="79.000"
            value={price}
            onChange={(event) => {
              setPrice(formatIntegerInput(event.target.value));
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
              setContactPhone(formatPhoneInput(event.target.value));
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
          <span className="text-sm font-semibold text-slate-900">Fotos</span>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 py-2 text-sm"
            type="file"
            multiple
            accept="image/*"
            onChange={onPhotoFilesChange}
          />
          <span className="text-xs text-slate-500">Selecione ate 10 imagens. A foto marcada como destaque vira a capa do anuncio.</span>

          {photos.length > 0 ? (
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((item, index) => {
                const isCover = item.id === coverPhotoId;
                return (
                  <div key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <img
                      src={item.previewUrl}
                      alt={`Preview da foto ${index + 1}`}
                      className="h-48 w-full object-cover"
                    />
                    <div className="grid gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => setCoverPhotoId(item.id)}
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${isCover ? "bg-brand-600 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
                      >
                        {isCover ? "Imagem de destaque" : "Definir como destaque"}
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => movePhoto(item.id, -1)}
                          disabled={index === 0}
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          onClick={() => movePhoto(item.id, 1)}
                          disabled={index === photos.length - 1}
                          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                        >
                          Descer
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(item.id)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
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
