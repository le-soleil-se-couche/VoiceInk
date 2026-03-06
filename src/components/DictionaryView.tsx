import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, X, CornerDownLeft, Info } from "lucide-react";
import { FixedSizeList as List, type ListChildComponentProps } from "react-window";
import { Input } from "./ui/input";
import { ConfirmDialog } from "./ui/dialog";
import { useSettings } from "../hooks/useSettings";
import { getAgentName } from "../utils/agentName";
import { parseDictionaryInput } from "../utils/parseDictionaryInput";

const VIRTUALIZATION_THRESHOLD = 300;
const VIRTUALIZED_ROW_HEIGHT = 34;

interface DictionaryRowData {
  words: string[];
  agentName: string;
  autoManagedLabel: string;
  getRemoveAriaLabel: (word: string) => string;
  onRemove: (word: string) => void;
}

const DictionaryRow = memo(function DictionaryRow({
  index,
  style,
  data,
}: ListChildComponentProps<DictionaryRowData>) {
  const word = data.words[index];
  const isAgentName = word === data.agentName;

  return (
    <div style={style} className="pr-1">
      <div
        className={`group flex items-center gap-2 py-[5px] px-2.5 rounded-[5px] border transition-colors duration-150 ${
          isAgentName
            ? "bg-primary/10 dark:bg-primary/15 text-primary border-primary/20 dark:border-primary/30"
            : "bg-foreground/[0.02] dark:bg-white/[0.03] text-foreground/60 dark:text-foreground/50 border-foreground/8 dark:border-white/6 hover:border-foreground/15 dark:hover:border-white/12 hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground/80 dark:hover:text-foreground/70"
        }`}
        title={isAgentName ? data.autoManagedLabel : undefined}
      >
        <span className="truncate">{word}</span>
        {!isAgentName && (
          <button
            onClick={() => data.onRemove(word)}
            aria-label={data.getRemoveAriaLabel(word)}
            className="ml-auto p-0.5 rounded-sm text-foreground/25 hover:!text-destructive/70 transition-colors duration-150"
          >
            <X size={10} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
});

function DictionaryView() {
  const { t } = useTranslation();
  const { customDictionary, setCustomDictionary } = useSettings();
  const agentName = getAgentName();
  const [newWord, setNewWord] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [listHeight, setListHeight] = useState(320);

  const isEmpty = customDictionary.length === 0;
  const shouldVirtualize = customDictionary.length >= VIRTUALIZATION_THRESHOLD;

  const handleAdd = useCallback(() => {
    const words = parseDictionaryInput(newWord, customDictionary);
    if (words.length > 0) {
      setCustomDictionary([...customDictionary, ...words]);
      setNewWord("");
    }
  }, [newWord, customDictionary, setCustomDictionary]);

  const handleRemove = useCallback(
    (word: string) => {
      if (word === agentName) return;
      setCustomDictionary(customDictionary.filter((w) => w !== word));
    },
    [customDictionary, setCustomDictionary, agentName]
  );

  useEffect(() => {
    if (!shouldVirtualize) return;

    const container = listContainerRef.current;
    if (!container) return;

    const updateHeight = () => {
      setListHeight(Math.max(VIRTUALIZED_ROW_HEIGHT * 4, container.clientHeight));
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);

    return () => observer.disconnect();
  }, [shouldVirtualize, customDictionary.length]);

  const getRemoveAriaLabel = useCallback(
    (word: string) => t("dictionary.removeWord", { word }),
    [t]
  );

  const virtualizedRowData = useMemo<DictionaryRowData>(
    () => ({
      words: customDictionary,
      agentName,
      autoManagedLabel: t("dictionary.autoManaged"),
      getRemoveAriaLabel,
      onRemove: handleRemove,
    }),
    [customDictionary, agentName, getRemoveAriaLabel, handleRemove, t]
  );

  return (
    <div className="flex flex-col h-full">
      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t("dictionary.clearTitle")}
        description={t("dictionary.clearDescription")}
        onConfirm={() => setCustomDictionary(customDictionary.filter((w) => w === agentName))}
        variant="destructive"
      />

      {isEmpty ? (
        /* ─── Empty state ─── */
        <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-4">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-b from-primary/8 to-primary/4 dark:from-primary/12 dark:to-primary/6 border border-primary/10 dark:border-primary/15 flex items-center justify-center mb-4">
            <BookOpen
              size={17}
              strokeWidth={1.5}
              className="text-primary/50 dark:text-primary/60"
            />
          </div>

          <h2 className="text-xs font-semibold text-foreground mb-1">{t("dictionary.title")}</h2>
          <p className="text-xs text-foreground/30 text-center leading-relaxed max-w-[240px] mb-6">
            {t("dictionary.description")}
          </p>

          <div className="w-full max-w-[260px] relative">
            <Input
              placeholder={t("dictionary.addPlaceholder")}
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              className="w-full h-8 text-xs pr-8 placeholder:text-foreground/20"
            />
            {newWord.trim() ? (
              <button
                onClick={handleAdd}
                aria-label={t("dictionary.addWord")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/50 hover:text-primary transition-colors"
              >
                <CornerDownLeft size={11} />
              </button>
            ) : (
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground/12 font-mono select-none pointer-events-none">
                ⏎
              </kbd>
            )}
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            {["VoiceInk", "Dr. Smith", "gRPC"].map((ex) => (
              <span
                key={ex}
                className="text-xs text-foreground/12 px-1.5 py-0.5 rounded-[4px] border border-dashed border-foreground/6 dark:border-white/5"
              >
                {ex}
              </span>
            ))}
          </div>

          <div className="mt-8 w-full max-w-[260px]">
            <button
              onClick={() => setShowInfo(!showInfo)}
              aria-expanded={showInfo}
              aria-label={t("dictionary.howItWorks")}
              className="flex items-center gap-1 text-xs text-foreground/15 hover:text-foreground/30 transition-colors mx-auto"
            >
              <Info size={9} />
              {t("dictionary.howItWorks")}
            </button>
            {showInfo && (
              <div className="mt-2.5 rounded-md bg-foreground/[0.02] dark:bg-white/[0.02] border border-foreground/5 dark:border-white/4 px-3 py-2.5">
                <p className="text-xs text-foreground/25 leading-[1.6]">
                  {t("dictionary.howItWorksDetail")}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── Populated state ─── */
        <>
          <div className="px-5 pt-4 pb-2.5 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-xs font-semibold text-foreground">{t("dictionary.title")}</h2>
              <span className="text-xs text-foreground/15 font-mono tabular-nums">
                {customDictionary.length}
              </span>
            </div>
            <button
              onClick={() => setConfirmClear(true)}
              aria-label={t("dictionary.clearAll")}
              className="text-xs text-foreground/15 hover:text-destructive/70 transition-colors"
            >
              {t("dictionary.clearAll")}
            </button>
          </div>

          <div className="px-5 pb-3">
            <div className="relative">
              <Input
                placeholder={t("dictionary.addPlaceholder")}
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
                className="w-full h-7 text-xs pr-8 placeholder:text-foreground/20"
              />
              {newWord.trim() ? (
                <button
                  onClick={handleAdd}
                  aria-label={t("dictionary.addWord")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/50 hover:text-primary transition-colors"
                >
                  <CornerDownLeft size={10} />
                </button>
              ) : (
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground/12 font-mono select-none pointer-events-none">
                  ⏎
                </kbd>
              )}
            </div>
          </div>

          <div className="mx-5 h-px bg-border/8 dark:bg-white/3" />

          <div
            ref={listContainerRef}
            className={`flex-1 px-5 py-3 ${shouldVirtualize ? "overflow-hidden" : "overflow-y-auto"}`}
          >
            {shouldVirtualize ? (
              <List
                className="scrollbar-thin"
                height={listHeight}
                width="100%"
                itemCount={customDictionary.length}
                itemData={virtualizedRowData}
                itemSize={VIRTUALIZED_ROW_HEIGHT}
              >
                {DictionaryRow}
              </List>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {customDictionary.map((word, index) => {
                  const isAgentName = word === agentName;
                  return (
                    <span
                      key={`${word}-${index}`}
                      className={`group inline-flex items-center gap-1 py-[3px]
                        rounded-[5px] text-xs
                        border transition-colors duration-150
                        ${
                          isAgentName
                            ? "pl-2.5 pr-2.5 bg-primary/10 dark:bg-primary/15 text-primary border-primary/20 dark:border-primary/30"
                            : "pl-2.5 pr-1 bg-foreground/[0.02] dark:bg-white/[0.03] text-foreground/60 dark:text-foreground/50 border-foreground/8 dark:border-white/6 hover:border-foreground/15 dark:hover:border-white/12 hover:bg-foreground/[0.04] dark:hover:bg-white/[0.06] hover:text-foreground/80 dark:hover:text-foreground/70"
                        }`}
                      title={isAgentName ? t("dictionary.autoManaged") : undefined}
                    >
                      {word}
                      {!isAgentName && (
                        <button
                          onClick={() => handleRemove(word)}
                          aria-label={getRemoveAriaLabel(word)}
                          className="p-0.5 rounded-sm
                            opacity-0 group-hover:opacity-100
                            text-foreground/25 hover:!text-destructive/70
                            transition-colors duration-150"
                        >
                          <X size={10} strokeWidth={2} />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 pb-3 flex items-start gap-1.5">
            <Info size={9} className="text-foreground/10 mt-px shrink-0" />
            <p className="text-xs text-foreground/12 leading-relaxed">
              {t("dictionary.inputHint")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(DictionaryView);
