"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  COLOR_PRESETS,
  DEFAULT_SITE_CONFIG,
  normalizeSiteConfig,
  type ConcertItem,
  type ConcertLabels,
  type SiteColors,
} from "@/lib/site-config";

interface AdminSiteConfigPayload {
  concertsLabels: ConcertLabels;
  colors: SiteColors;
  concerts: ConcertItem[];
}

const COLOR_FIELDS = [
  { key: "concertBg", label: "Цвет фона секции концертов" },
  { key: "dateColor", label: "Цвет даты" },
  { key: "cityColor", label: "Цвет города" },
  { key: "sublineColor", label: "Цвет подписи" },
  { key: "venueColor", label: "Цвет места" },
  { key: "timeColor", label: "Цвет времени" },
  { key: "buttonBorderColor", label: "Цвет рамки кнопки" },
  { key: "buttonTextColor", label: "Цвет текста кнопки" },
  { key: "buttonHoverBg", label: "Цвет фона кнопки при наведении" },
  { key: "buttonHoverText", label: "Цвет текста кнопки при наведении" },
] as const;

function createDraftConcert(sortOrder: number): ConcertItem {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 10000)}`;

  return {
    id: `temp-${random}`,
    enabled: true,
    date: "",
    city: "НОВЫЙ ГОРОД",
    subline: "+ LIVE BAND",
    venueLine1: "",
    venueLine2: "",
    time: "20:00",
    ticketText: "КУПИТЬ БИЛЕТ",
    ticketUrl: "#",
    sortOrder,
  };
}

function normalizeOrder(concerts: ConcertItem[]): ConcertItem[] {
  return concerts
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((concert, index) => ({
      ...concert,
      sortOrder: index + 1,
    }));
}

function ensureConcertIds(concerts: ConcertItem[]): ConcertItem[] {
  return concerts.map((concert, index) => ({
    ...concert,
    id:
      concert.id ??
      `local-${index + 1}-${concert.date || "date"}-${concert.city || "city"}`,
  }));
}

function moveById(
  concerts: ConcertItem[],
  concertId: string,
  direction: "up" | "down",
): ConcertItem[] {
  const ordered = normalizeOrder(concerts);
  const from = ordered.findIndex((concert) => concert.id === concertId);
  if (from < 0) {
    return ordered;
  }

  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ordered.length) {
    return ordered;
  }

  const next = [...ordered];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return normalizeOrder(next);
}

function insertAfterId(
  concerts: ConcertItem[],
  afterConcertId: string,
  draft: ConcertItem,
): ConcertItem[] {
  const ordered = normalizeOrder(concerts);
  const index = ordered.findIndex((concert) => concert.id === afterConcertId);
  if (index < 0) {
    return normalizeOrder([...ordered, draft]);
  }

  const next = [...ordered];
  next.splice(index + 1, 0, draft);
  return normalizeOrder(next);
}

function duplicateById(
  concerts: ConcertItem[],
  concertId: string,
): ConcertItem[] {
  const source = concerts.find((concert) => concert.id === concertId);
  if (!source) {
    return concerts;
  }

  const draft = createDraftConcert(source.sortOrder + 1);
  draft.enabled = source.enabled;
  draft.date = source.date;
  draft.city = source.city;
  draft.subline = source.subline;
  draft.venueLine1 = source.venueLine1;
  draft.venueLine2 = source.venueLine2;
  draft.time = source.time;
  draft.ticketText = source.ticketText;
  draft.ticketUrl = source.ticketUrl;

  return insertAfterId(concerts, concertId, draft);
}

function removeById(concerts: ConcertItem[], concertId: string): ConcertItem[] {
  return normalizeOrder(concerts.filter((concert) => concert.id !== concertId));
}

function toApiPayload(state: AdminSiteConfigPayload): AdminSiteConfigPayload {
  return {
    concertsLabels: state.concertsLabels,
    colors: state.colors,
    concerts: normalizeOrder(state.concerts).map((concert) => ({
      ...concert,
      ticketText: concert.ticketText.trim() || "КУПИТЬ БИЛЕТ",
      ticketUrl: concert.ticketUrl.trim() || "#",
    })),
  };
}

function snapshot(state: AdminSiteConfigPayload): string {
  return JSON.stringify(toApiPayload(state));
}

function mapError(status: number): string {
  if (status === 429) {
    return "Слишком много запросов. Попробуй через минуту.";
  }
  if (status === 401) {
    return "Сессия истекла. Войди снова.";
  }
  return "Ошибка загрузки данных";
}

function prepareState(payload: AdminSiteConfigPayload): AdminSiteConfigPayload {
  const normalized = normalizeSiteConfig({
    concertsLabels: payload.concertsLabels,
    colors: payload.colors,
    concerts: payload.concerts,
    footer: DEFAULT_SITE_CONFIG.footer,
  });

  return {
    concertsLabels: normalized.concertsLabels,
    colors: normalized.colors,
    concerts: ensureConcertIds(normalizeOrder(normalized.concerts)),
  };
}

export function SiteAdminPanel() {
  const router = useRouter();

  const [state, setState] = useState<AdminSiteConfigPayload>({
    concertsLabels: DEFAULT_SITE_CONFIG.concertsLabels,
    colors: DEFAULT_SITE_CONFIG.colors,
    concerts: ensureConcertIds(DEFAULT_SITE_CONFIG.concerts),
  });
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("Загрузка...");
  const [error, setError] = useState<string | null>(null);
  const [dbUnavailable, setDbUnavailable] = useState(false);
  const [savedHash, setSavedHash] = useState("");
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);

  const orderedConcerts = useMemo(
    () => normalizeOrder(state.concerts),
    [state.concerts],
  );

  useEffect(() => {
    if (orderedConcerts.length === 0) {
      if (selectedConcertId !== null) {
        setSelectedConcertId(null);
      }
      return;
    }

    if (
      !selectedConcertId ||
      !orderedConcerts.some((concert) => concert.id === selectedConcertId)
    ) {
      setSelectedConcertId(orderedConcerts[0]?.id ?? null);
    }
  }, [orderedConcerts, selectedConcertId]);

  const selectedConcert = useMemo(
    () =>
      orderedConcerts.find((concert) => concert.id === selectedConcertId) ??
      orderedConcerts[0] ??
      null,
    [orderedConcerts, selectedConcertId],
  );

  const hasUnsavedChanges = useMemo(
    () => savedHash.length > 0 && snapshot(state) !== savedHash,
    [savedHash, state],
  );

  function markDirty() {
    setStatus("Есть несохранённые изменения");
  }

  async function loadConfig() {
    setIsLoading(true);
    setStatus("Загрузка...");
    setError(null);
    setDbUnavailable(false);

    try {
      const response = await fetch("/api/admin/site-config", {
        cache: "no-store",
      });
      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        data?: AdminSiteConfigPayload;
        error?: string;
      } | null;

      if (!response.ok || !payload?.data) {
        setError(mapError(response.status));
        setDbUnavailable(response.status === 503);
        setStatus("Ошибка загрузки");
        return;
      }

      const nextState = prepareState(payload.data);
      setState(nextState);
      setSavedHash(snapshot(nextState));
      setSelectedConcertId(nextState.concerts[0]?.id ?? null);
      setStatus("Конфиг загружен");
    } catch {
      setDbUnavailable(true);
      setError("База данных временно недоступна");
      setStatus("Ошибка загрузки");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateConcertField<K extends keyof ConcertItem>(
    concertId: string,
    key: K,
    value: ConcertItem[K],
  ) {
    setState((prev) => ({
      ...prev,
      concerts: normalizeOrder(
        prev.concerts.map((concert) =>
          concert.id === concertId ? { ...concert, [key]: value } : concert,
        ),
      ),
    }));
    markDirty();
  }

  function addConcertToEnd() {
    setState((prev) => {
      const draft = createDraftConcert(prev.concerts.length + 1);
      const next = normalizeOrder([...prev.concerts, draft]);
      setSelectedConcertId(draft.id ?? null);
      return { ...prev, concerts: next };
    });
    markDirty();
  }

  function addConcertBetween(concertId: string) {
    setState((prev) => {
      const draft = createDraftConcert(prev.concerts.length + 1);
      const next = insertAfterId(prev.concerts, concertId, draft);
      setSelectedConcertId(draft.id ?? null);
      return { ...prev, concerts: next };
    });
    markDirty();
  }

  function moveConcert(concertId: string, direction: "up" | "down") {
    setState((prev) => ({
      ...prev,
      concerts: moveById(prev.concerts, concertId, direction),
    }));
    markDirty();
  }

  function duplicateConcert(concertId: string) {
    setState((prev) => {
      const next = duplicateById(prev.concerts, concertId);
      const newlyCreated = next.find((concert) =>
        concert.id?.startsWith("temp-"),
      );
      if (newlyCreated?.id) {
        setSelectedConcertId(newlyCreated.id);
      }
      return { ...prev, concerts: next };
    });
    markDirty();
  }

  function deleteSelected() {
    if (!selectedConcert || orderedConcerts.length <= 1) {
      return;
    }

    const confirmed = window.confirm("Удалить концерт?");
    if (!confirmed) {
      return;
    }

    setState((prev) => {
      const next = removeById(prev.concerts, selectedConcert.id ?? "");
      setSelectedConcertId(next[0]?.id ?? null);
      return { ...prev, concerts: next };
    });
    markDirty();
  }

  async function saveChanges() {
    setIsSaving(true);
    setStatus("Сохранение...");
    setError(null);

    try {
      const response = await fetch("/api/admin/site-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiPayload(state)),
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        data?: AdminSiteConfigPayload;
        error?: string;
      } | null;

      if (!response.ok || !payload?.data) {
        setError(mapError(response.status));
        setStatus("Ошибка сохранения");
        return;
      }

      const nextState = prepareState(payload.data);
      setState(nextState);
      setSavedHash(snapshot(nextState));
      setSelectedConcertId(
        nextState.concerts.find((concert) => concert.id === selectedConcertId)
          ?.id ??
          nextState.concerts[0]?.id ??
          null,
      );
      setStatus("Сохранено");
    } catch {
      setError("Не удалось сохранить изменения");
      setStatus("Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  }

  async function resetToDefaults() {
    const confirmed = window.confirm(
      "Сбросить настройки концертов к умолчанию?",
    );
    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus("Сброс...");

    try {
      const response = await fetch("/api/admin/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const payload = (await response.json().catch(() => null)) as {
        data?: AdminSiteConfigPayload;
        error?: string;
      } | null;

      if (!response.ok || !payload?.data) {
        setError(mapError(response.status));
        setStatus("Ошибка сброса");
        return;
      }

      const nextState = prepareState(payload.data);
      setState(nextState);
      setSavedHash(snapshot(nextState));
      setSelectedConcertId(nextState.concerts[0]?.id ?? null);
      setStatus("Сброшено");
    } catch {
      setError("Не удалось выполнить сброс");
      setStatus("Ошибка сброса");
    } finally {
      setIsSaving(false);
    }
  }

  async function logout() {
    setIsSaving(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  const selectedOrderIndex = orderedConcerts.findIndex(
    (concert) => concert.id === selectedConcert?.id,
  );

  return (
    <main className="admin-shell">
      <div className="admin-container">
        <section className="admin-topbar">
          <h1 className="admin-title">BRANYA Admin</h1>
          <div className="admin-top-actions">
            <Link className="admin-link-button" href="/">
              ← На сайт
            </Link>
            <button
              type="button"
              className="admin-save-button"
              onClick={() => void saveChanges()}
              disabled={isLoading || isSaving}
            >
              Сохранить
            </button>
            <button
              type="button"
              className="admin-reset-button"
              onClick={() => void resetToDefaults()}
              disabled={isLoading || isSaving}
            >
              Сбросить
            </button>
            <button
              type="button"
              className="admin-outline-button"
              onClick={() => void logout()}
              disabled={isSaving}
            >
              Выйти
            </button>
          </div>
        </section>

        <div className="admin-status-row">
          <p className="admin-status">{status}</p>
          {hasUnsavedChanges ? (
            <p className="admin-dirty">Есть несохранённые изменения</p>
          ) : null}
        </div>

        {dbUnavailable ? (
          <section className="admin-db-alert">
            <h2>База данных временно недоступна</h2>
            <p>Проверь Docker/PostgreSQL и переменные окружения</p>
            <button
              type="button"
              className="admin-save-button"
              onClick={() => void loadConfig()}
              disabled={isLoading || isSaving}
            >
              Повторить
            </button>
          </section>
        ) : (
          <>
            {error ? <p className="admin-error">{error}</p> : null}

            <section className="admin-layout">
              <div className="admin-main-panel">
                <div className="admin-section-head">
                  <h2>Концерты</h2>
                  <button
                    type="button"
                    className="admin-outline-button"
                    onClick={addConcertToEnd}
                    disabled={isLoading || isSaving}
                  >
                    Добавить концерт
                  </button>
                </div>

                <div className="admin-concert-list">
                  {orderedConcerts.map((concert, index) => {
                    const concertId = concert.id ?? "";
                    const isSelected =
                      concertId === (selectedConcert?.id ?? "");

                    return (
                      <div key={concertId || `${concert.sortOrder}-${index}`}>
                        <div
                          className={`admin-preview-row ${isSelected ? "is-selected" : ""}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedConcertId(concertId)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedConcertId(concertId);
                            }
                          }}
                        >
                          <div className="admin-preview-top">
                            <span className="admin-preview-order">
                              #{concert.sortOrder}
                            </span>
                            <span
                              className={`admin-preview-state ${concert.enabled ? "is-enabled" : "is-disabled"}`}
                            >
                              {concert.enabled ? "ВКЛ" : "ВЫКЛ"}
                            </span>
                          </div>
                          <div className="admin-preview-grid">
                            <div>
                              <div
                                className="admin-preview-date"
                                style={{ color: state.colors.dateColor }}
                              >
                                {concert.date || "—"}
                              </div>
                            </div>
                            <div>
                              <div
                                className="admin-preview-city"
                                style={{ color: state.colors.cityColor }}
                              >
                                {concert.city || "—"}
                              </div>
                              {concert.subline ? (
                                <div
                                  className="admin-preview-subline"
                                  style={{ color: state.colors.sublineColor }}
                                >
                                  {concert.subline}
                                </div>
                              ) : null}
                            </div>
                            <div
                              className="admin-preview-venue"
                              style={{ color: state.colors.venueColor }}
                            >
                              <div>{concert.venueLine1 || "—"}</div>
                              {concert.venueLine2 ? (
                                <div>{concert.venueLine2}</div>
                              ) : null}
                            </div>
                            <div
                              className="admin-preview-time"
                              style={{ color: state.colors.timeColor }}
                            >
                              {concert.time || "—"}
                            </div>
                            <div>
                              <span
                                className="admin-preview-ticket"
                                style={{
                                  color: state.colors.buttonTextColor,
                                  borderColor: state.colors.buttonBorderColor,
                                }}
                              >
                                {concert.ticketText || "КУПИТЬ БИЛЕТ"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-row-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveConcert(concertId, "up");
                            }}
                            disabled={index === 0 || isSaving}
                            title="Вверх"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-row-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveConcert(concertId, "down");
                            }}
                            disabled={
                              index === orderedConcerts.length - 1 || isSaving
                            }
                            title="Вниз"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-row-action"
                            onClick={(event) => {
                              event.stopPropagation();
                              duplicateConcert(concertId);
                            }}
                            disabled={isSaving}
                            title="Дублировать"
                          >
                            ⧉
                          </button>
                        </div>

                        {index < orderedConcerts.length - 1 ? (
                          <button
                            type="button"
                            className="admin-insert-button"
                            onClick={() => addConcertBetween(concertId)}
                            disabled={isSaving}
                          >
                            + Добавить здесь
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="admin-editor-panel">
                <h2>Редактирование концерта</h2>
                {selectedConcert ? (
                  <>
                    <p className="admin-editor-subtitle">
                      {selectedConcert.city || "НОВЫЙ ГОРОД"}{" "}
                      {selectedConcert.date ? `• ${selectedConcert.date}` : ""}
                    </p>

                    <div className="admin-grid admin-grid-2">
                      <label className="admin-field">
                        <span>Показывать концерт</span>
                        <select
                          value={selectedConcert.enabled ? "true" : "false"}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "enabled",
                              event.target.value === "true",
                            )
                          }
                          disabled={isSaving}
                        >
                          <option value="true">Да</option>
                          <option value="false">Нет</option>
                        </select>
                      </label>

                      <label className="admin-field">
                        <span>Порядок</span>
                        <input
                          type="number"
                          min={1}
                          max={orderedConcerts.length}
                          value={selectedConcert.sortOrder}
                          onChange={(event) => {
                            const target = Number(event.target.value);
                            if (!Number.isFinite(target)) {
                              return;
                            }
                            const safeTarget = Math.max(
                              1,
                              Math.min(
                                orderedConcerts.length,
                                Math.trunc(target),
                              ),
                            );
                            const current = normalizeOrder(state.concerts);
                            const from = current.findIndex(
                              (item) => item.id === selectedConcert.id,
                            );
                            if (from < 0) {
                              return;
                            }
                            const next = [...current];
                            const [item] = next.splice(from, 1);
                            next.splice(safeTarget - 1, 0, item);
                            setState((prev) => ({
                              ...prev,
                              concerts: normalizeOrder(next),
                            }));
                            markDirty();
                          }}
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field">
                        <span>Дата</span>
                        <input
                          value={selectedConcert.date}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "date",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field">
                        <span>Город</span>
                        <input
                          value={selectedConcert.city}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "city",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field admin-field-span-2">
                        <span>Подпись</span>
                        <input
                          value={selectedConcert.subline}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "subline",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field">
                        <span>Место, строка 1</span>
                        <input
                          value={selectedConcert.venueLine1}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "venueLine1",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field">
                        <span>Место, строка 2</span>
                        <input
                          value={selectedConcert.venueLine2}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "venueLine2",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field">
                        <span>Время</span>
                        <input
                          value={selectedConcert.time}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "time",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field">
                        <span>Текст кнопки</span>
                        <input
                          value={selectedConcert.ticketText}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "ticketText",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>

                      <label className="admin-field admin-field-span-2">
                        <span>Ссылка на билет</span>
                        <input
                          value={selectedConcert.ticketUrl}
                          onChange={(event) =>
                            updateConcertField(
                              selectedConcert.id ?? "",
                              "ticketUrl",
                              event.target.value,
                            )
                          }
                          disabled={isSaving}
                        />
                      </label>
                    </div>

                    <div className="admin-editor-actions">
                      <button
                        type="button"
                        className="admin-outline-button"
                        onClick={() =>
                          moveConcert(selectedConcert.id ?? "", "up")
                        }
                        disabled={selectedOrderIndex <= 0 || isSaving}
                      >
                        Вверх
                      </button>
                      <button
                        type="button"
                        className="admin-outline-button"
                        onClick={() =>
                          moveConcert(selectedConcert.id ?? "", "down")
                        }
                        disabled={
                          selectedOrderIndex < 0 ||
                          selectedOrderIndex >= orderedConcerts.length - 1 ||
                          isSaving
                        }
                      >
                        Вниз
                      </button>
                      <button
                        type="button"
                        className="admin-outline-button"
                        onClick={() =>
                          duplicateConcert(selectedConcert.id ?? "")
                        }
                        disabled={isSaving}
                      >
                        Дублировать
                      </button>
                      <button
                        type="button"
                        className="admin-remove-button"
                        onClick={deleteSelected}
                        disabled={orderedConcerts.length <= 1 || isSaving}
                      >
                        Удалить
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="admin-editor-empty">
                    Выбери концерт из списка слева
                  </p>
                )}

                <div className="admin-panel admin-panel-embedded">
                  <button
                    type="button"
                    className="admin-collapse-toggle"
                    onClick={() => setIsColorPanelOpen((prev) => !prev)}
                  >
                    Цвета концертов {isColorPanelOpen ? "−" : "+"}
                  </button>

                  {isColorPanelOpen ? (
                    <div className="admin-grid admin-grid-1">
                      {COLOR_FIELDS.map((field) => {
                        const currentValue = state.colors[field.key];
                        const normalizedValue = currentValue.toUpperCase();
                        const selectedPreset =
                          COLOR_PRESETS.find(
                            (preset) => preset.value === normalizedValue,
                          )?.value ?? "__custom";

                        return (
                          <div key={field.key} className="admin-color-control">
                            <label className="admin-field">
                              <span>{field.label}</span>
                              <div className="admin-color-row">
                                <input
                                  type="color"
                                  value={currentValue}
                                  onChange={(event) => {
                                    setState((prev) => ({
                                      ...prev,
                                      colors: {
                                        ...prev.colors,
                                        [field.key]: event.target.value,
                                      },
                                    }));
                                    markDirty();
                                  }}
                                  disabled={isSaving}
                                />
                                <select
                                  value={selectedPreset}
                                  onChange={(event) => {
                                    if (event.target.value === "__custom") {
                                      return;
                                    }
                                    setState((prev) => ({
                                      ...prev,
                                      colors: {
                                        ...prev.colors,
                                        [field.key]: event.target.value,
                                      },
                                    }));
                                    markDirty();
                                  }}
                                  disabled={isSaving}
                                >
                                  <option value="__custom">Custom</option>
                                  {COLOR_PRESETS.map((preset) => (
                                    <option
                                      key={preset.value}
                                      value={preset.value}
                                    >
                                      {preset.name}
                                    </option>
                                  ))}
                                </select>
                                <span className="admin-color-hex">
                                  {normalizedValue}
                                </span>
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
