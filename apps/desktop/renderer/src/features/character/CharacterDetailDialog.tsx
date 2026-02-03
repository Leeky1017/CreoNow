import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Avatar,
  Button,
  Input,
  Textarea,
  Select,
} from "../../components/primitives";
import type {
  Character,
  CharacterRelationship,
  ChapterAppearance,
} from "./types";
import { ARCHETYPE_OPTIONS, ROLE_DISPLAY, RELATIONSHIP_TYPE_DISPLAY } from "./types";

export interface CharacterDetailDialogProps {
  /** Controlled open state */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Character to display/edit */
  character: Character | null;
  /** Callback when character is saved */
  onSave?: (character: Character) => void;
  /** Callback when character is deleted */
  onDelete?: (characterId: string) => void;
  /** Callback when navigating to a chapter */
  onNavigateToChapter?: (chapterId: string) => void;
  /** Available characters for adding relationships */
  availableCharacters?: Character[];
}

// ============================================================================
// Styles
// ============================================================================

const overlayStyles = [
  "fixed",
  "inset-0",
  "z-[var(--z-modal)]",
  "bg-[rgba(0,0,0,0.7)]",
  "backdrop-blur-[4px]",
  "transition-opacity",
  "duration-[var(--duration-slow)]",
  "ease-[var(--ease-default)]",
  "data-[state=open]:opacity-100",
  "data-[state=closed]:opacity-0",
].join(" ");

const contentStyles = [
  "fixed",
  "left-1/2",
  "top-1/2",
  "-translate-x-1/2",
  "-translate-y-1/2",
  "z-[var(--z-modal)]",
  "w-[560px]",
  "max-h-[92vh]",
  "bg-[var(--color-bg-surface)]",
  "border",
  "border-[var(--color-border-default)]",
  "rounded-[var(--radius-xl)]",
  "shadow-2xl",
  "flex",
  "flex-col",
  "overflow-hidden",
  "relative",
  // Animation
  "transition-[opacity,transform]",
  "duration-[var(--duration-slow)]",
  "ease-[cubic-bezier(0.16,1,0.3,1)]",
  "data-[state=open]:opacity-100",
  "data-[state=open]:scale-100",
  "data-[state=open]:translate-y-0",
  "data-[state=closed]:opacity-0",
  "data-[state=closed]:scale-[0.98]",
  "data-[state=closed]:translate-y-5",
  "focus:outline-none",
].join(" ");

const labelStyles = [
  "text-[10px]",
  "uppercase",
  "tracking-[0.1em]",
  "text-[var(--color-fg-placeholder)]",
  "font-semibold",
  "pl-0.5",
].join(" ");

const sectionHeaderStyles = [
  "flex",
  "items-center",
  "justify-between",
  "border-b",
  "border-[var(--color-border-default)]",
  "pb-2",
].join(" ");

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Camera icon for avatar upload
 */
function CameraIcon() {
  return (
    <svg
      className="text-white w-5 h-5 drop-shadow-md"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

/**
 * Close icon
 */
function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Plus icon
 */
function PlusIcon({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * Document icon
 */
function DocumentIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

/**
 * Arrow right icon
 */
function ArrowRightIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

/**
 * Trash icon
 */
function TrashIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/**
 * Personality trait tag component
 */
function TraitTag({
  trait,
  onRemove,
}: {
  trait: string;
  onRemove?: () => void;
}) {
  return (
    <div
      className={[
        "px-2.5",
        "py-1",
        "rounded",
        "bg-[#151515]",
        "border",
        "border-[var(--color-border-default)]",
        "text-xs",
        "text-[var(--color-fg-muted)]",
        "flex",
        "items-center",
        "gap-2",
        "hover:border-[var(--color-border-hover)]",
        "hover:bg-[var(--color-bg-hover)]",
        "transition-all",
        "cursor-default",
        "select-none",
        "group",
      ].join(" ")}
    >
      {trait}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className={[
            "opacity-0",
            "group-hover:opacity-100",
            "text-[var(--color-fg-placeholder)]",
            "hover:text-[var(--color-error)]",
            "transition-all",
            "scale-75",
            "group-hover:scale-100",
          ].join(" ")}
          aria-label={`Remove ${trait} trait`}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}

/**
 * Relationship item component
 */
function RelationshipItem({
  relationship,
  onRemove,
}: {
  relationship: CharacterRelationship;
  onRemove?: () => void;
}) {
  const typeConfig = RELATIONSHIP_TYPE_DISPLAY[relationship.type];

  return (
    <div className="flex items-center justify-between p-3 hover:bg-[#111] transition-colors group">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar
            src={relationship.characterAvatar}
            fallback={relationship.characterName}
            size="sm"
            className="grayscale opacity-60 border border-[var(--color-border-default)]"
          />
          <div className="absolute -bottom-1 -right-1 bg-[var(--color-bg-hover)] rounded-full p-[2px] border border-[var(--color-border-default)]">
            <div className={`w-2 h-2 rounded-full ${typeConfig.color}`} />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-[var(--color-fg-muted)]">
            {relationship.characterName}
          </span>
          <span className="text-[10px] text-[var(--color-fg-placeholder)]">
            {relationship.characterRole
              ? ROLE_DISPLAY[relationship.characterRole]?.label
              : ""}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-medium text-[var(--color-fg-muted)] bg-[var(--color-bg-hover)] px-2 py-1 rounded border border-[var(--color-border-default)]">
          {typeConfig.label}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 text-[var(--color-fg-placeholder)] hover:text-[var(--color-error)] transition-all"
            aria-label={`Remove relationship with ${relationship.characterName}`}
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Chapter appearance link component
 */
function ChapterLink({
  appearance,
  onNavigate,
}: {
  appearance: ChapterAppearance;
  onNavigate?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className={[
        "group",
        "flex",
        "items-center",
        "justify-between",
        "p-2.5",
        "w-full",
        "text-left",
        "hover:bg-[#151515]",
        "rounded",
        "border",
        "border-transparent",
        "hover:border-[var(--color-border-default)]",
        "transition-all",
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span className="text-[var(--color-fg-placeholder)] group-hover:text-[var(--color-info)] transition-colors">
          <DocumentIcon />
        </span>
        <span className="text-xs text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-default)] transition-colors">
          {appearance.title}
        </span>
      </div>
      <span className="text-[var(--color-border-default)] group-hover:text-[var(--color-fg-placeholder)] opacity-0 group-hover:opacity-100 transition-all">
        <ArrowRightIcon />
      </span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CharacterDetailDialog - Modal dialog for viewing and editing character details
 *
 * Features:
 * - Avatar with upload hover state
 * - Name, age, archetype editing
 * - Description textarea
 * - Personality traits with add/remove
 * - Relationship management
 * - Chapter appearances with navigation
 * - Save/Cancel/Delete actions
 *
 * @example
 * ```tsx
 * <CharacterDetailDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   character={selectedCharacter}
 *   onSave={(updated) => updateCharacter(updated)}
 *   onDelete={(id) => deleteCharacter(id)}
 * />
 * ```
 */
export function CharacterDetailDialog({
  open,
  onOpenChange,
  character,
  onSave,
  onDelete,
  onNavigateToChapter,
}: CharacterDetailDialogProps): JSX.Element | null {
  // Form state
  const [editedCharacter, setEditedCharacter] = React.useState<Character | null>(null);
  const [newTrait, setNewTrait] = React.useState("");

  // Initialize form state when character changes
  React.useEffect(() => {
    if (character) {
      setEditedCharacter({ ...character });
    }
  }, [character]);

  // Reset when dialog closes
  React.useEffect(() => {
    if (!open) {
      setNewTrait("");
    }
  }, [open]);

  if (!editedCharacter) {
    return null;
  }

  const roleConfig = ROLE_DISPLAY[editedCharacter.role];

  const handleFieldChange = <K extends keyof Character>(
    field: K,
    value: Character[K],
  ) => {
    setEditedCharacter((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleAddTrait = () => {
    const trimmed = newTrait.trim();
    if (trimmed && editedCharacter && !editedCharacter.traits.includes(trimmed)) {
      handleFieldChange("traits", [...editedCharacter.traits, trimmed]);
      setNewTrait("");
    }
  };

  const handleRemoveTrait = (trait: string) => {
    if (editedCharacter) {
      handleFieldChange(
        "traits",
        editedCharacter.traits.filter((t) => t !== trait),
      );
    }
  };

  const handleRemoveRelationship = (characterId: string) => {
    if (editedCharacter) {
      handleFieldChange(
        "relationships",
        editedCharacter.relationships.filter((r) => r.characterId !== characterId),
      );
    }
  };

  const handleSave = () => {
    if (editedCharacter) {
      onSave?.(editedCharacter);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (editedCharacter) {
      onDelete?.(editedCharacter.id);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleTraitKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTrait();
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlayStyles} />
        <DialogPrimitive.Content className={contentStyles}>
          {/* Gradient line at top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--color-border-hover)] to-transparent opacity-50" />

          {/* Header: Avatar + Name + Role */}
          <div className="p-6 pb-0 flex items-start gap-6 shrink-0">
            {/* Avatar with upload overlay */}
            <div className="relative group cursor-pointer shrink-0">
              <div className="w-16 h-16 rounded-full p-[1px] bg-gradient-to-b from-[var(--color-border-hover)] to-[#111]">
                <Avatar
                  src={editedCharacter.avatarUrl}
                  fallback={editedCharacter.name}
                  size="lg"
                  className="w-full h-full group-hover:brightness-75 transition-all"
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon />
              </div>
            </div>

            {/* Name and role */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={editedCharacter.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className="bg-transparent text-xl font-semibold text-[var(--color-fg-default)] focus:outline-none border-b border-transparent focus:border-[var(--color-info)]/30 pb-0.5 w-full mr-4 placeholder-[var(--color-fg-placeholder)]"
                  placeholder="Character Name"
                />
                <DialogPrimitive.Close
                  className="p-2 text-[var(--color-fg-placeholder)] hover:text-[var(--color-fg-default)] transition-colors rounded hover:bg-[var(--color-bg-hover)]"
                  aria-label="Close"
                >
                  <CloseIcon />
                </DialogPrimitive.Close>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "bg-[#1a2333]",
                    roleConfig.color.replace("text-", "text-"),
                    "border",
                    "border-[var(--color-info)]/30",
                    "px-2",
                    "py-0.5",
                    "rounded",
                    "text-[11px]",
                    "font-medium",
                    "uppercase",
                    "tracking-wide",
                  ].join(" ")}
                >
                  {roleConfig.label}
                </span>
                <div className="h-3 w-[1px] bg-[var(--color-border-hover)]" />
                <span className="text-[var(--color-fg-placeholder)] text-xs px-2 py-0.5 border border-[var(--color-border-default)] rounded cursor-pointer hover:border-[var(--color-border-hover)] hover:text-[var(--color-fg-muted)] transition-colors bg-[var(--color-bg-base)]">
                  {editedCharacter.group === "main"
                    ? "Main Cast"
                    : editedCharacter.group === "supporting"
                      ? "Supporting"
                      : "Others"}
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Age and Archetype */}
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className={labelStyles}>Age</label>
                <Input
                  type="text"
                  value={editedCharacter.age?.toString() ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleFieldChange("age", val ? parseInt(val, 10) : undefined);
                  }}
                  fullWidth
                />
              </div>
              <div className="col-span-4 space-y-1.5">
                <label className={labelStyles}>Archetype</label>
                <Select
                  value={editedCharacter.archetype ?? ""}
                  onValueChange={(val) => handleFieldChange("archetype", val)}
                  options={ARCHETYPE_OPTIONS.map((a) => ({
                    value: a.value,
                    label: a.label,
                  }))}
                  placeholder="Select archetype..."
                  fullWidth
                />
              </div>
              <div className="col-span-6 space-y-1.5">
                <label className={labelStyles}>Appearance &amp; Description</label>
                <Textarea
                  value={editedCharacter.description ?? ""}
                  onChange={(e) => handleFieldChange("description", e.target.value)}
                  placeholder="Describe the character..."
                  fullWidth
                  className="min-h-[80px] focus:min-h-[100px] transition-all resize-none"
                />
              </div>
            </div>

            {/* Personality Traits */}
            <div className="space-y-3">
              <div className={sectionHeaderStyles}>
                <label className={labelStyles}>Personality Traits</label>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {editedCharacter.traits.map((trait) => (
                  <TraitTag
                    key={trait}
                    trait={trait}
                    onRemove={() => handleRemoveTrait(trait)}
                  />
                ))}
                <input
                  type="text"
                  placeholder="+ Add trait"
                  value={newTrait}
                  onChange={(e) => setNewTrait(e.target.value)}
                  onKeyDown={handleTraitKeyDown}
                  onBlur={handleAddTrait}
                  className="bg-transparent text-xs text-[var(--color-fg-default)] placeholder-[var(--color-fg-placeholder)] focus:outline-none focus:placeholder-[var(--color-fg-muted)] min-w-[60px] py-1 px-1 ml-1 hover:bg-[#111] rounded transition-colors"
                />
              </div>
            </div>

            {/* Relationships */}
            <div className="space-y-3">
              <div className={sectionHeaderStyles}>
                <label className={labelStyles}>Relationships</label>
                <button
                  type="button"
                  className="text-[10px] text-[var(--color-info)] hover:text-[var(--color-info)]/80 flex items-center gap-1 font-medium transition-colors"
                >
                  <PlusIcon />
                  Add Relation
                </button>
              </div>
              {editedCharacter.relationships.length > 0 ? (
                <div className="rounded-lg overflow-hidden bg-[#0a0a0a] border border-[var(--color-bg-hover)] divide-y divide-[var(--color-bg-hover)]">
                  {editedCharacter.relationships.map((rel) => (
                    <RelationshipItem
                      key={rel.characterId}
                      relationship={rel}
                      onRemove={() => handleRemoveRelationship(rel.characterId)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[var(--color-fg-placeholder)] py-4 text-center border border-dashed border-[var(--color-border-default)] rounded-lg">
                  No relationships added yet
                </div>
              )}
            </div>

            {/* Chapter Appearances */}
            <div className="space-y-3 pb-2">
              <div className={sectionHeaderStyles}>
                <label className={labelStyles}>Appearances</label>
                <span className="text-[10px] text-[var(--color-fg-placeholder)]">
                  {editedCharacter.appearances.length} Chapters
                </span>
              </div>
              {editedCharacter.appearances.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {editedCharacter.appearances.map((appearance) => (
                    <ChapterLink
                      key={appearance.id}
                      appearance={appearance}
                      onNavigate={() => onNavigateToChapter?.(appearance.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[var(--color-fg-placeholder)] py-4 text-center border border-dashed border-[var(--color-border-default)] rounded-lg">
                  Character hasn&apos;t appeared in any chapters yet
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--color-border-default)] bg-[var(--color-bg-surface)] flex items-center justify-between shrink-0">
            {/* Delete 按钮: 图标和文字同一行，gap-1.5 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-[var(--color-error)] opacity-60 hover:opacity-100"
            >
              <span className="inline-flex items-center gap-1.5">
                <TrashIcon />
                Delete
              </span>
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              {/* Save Changes: 无图标，secondary 样式 */}
              <Button variant="secondary" size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>

          {/* Hidden title for accessibility */}
          <DialogPrimitive.Title className="sr-only">
            Edit Character: {editedCharacter.name}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Edit character details including name, description, traits, and relationships.
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
