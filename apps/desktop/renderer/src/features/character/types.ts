/**
 * Character feature types
 *
 * Type definitions for the Character Manager feature.
 */

/**
 * Character role type
 */
export type CharacterRole =
  | "protagonist"
  | "antagonist"
  | "deuteragonist"
  | "mentor"
  | "ally";

/**
 * Character group category
 */
export type CharacterGroup = "main" | "supporting" | "others";

/**
 * Relationship types between characters
 */
export type RelationshipType =
  | "rival"
  | "mentor"
  | "ally"
  | "enemy"
  | "friend"
  | "family";

/**
 * Character relationship
 */
export interface CharacterRelationship {
  /** ID of the related character */
  characterId: string;
  /** Name of the related character */
  characterName: string;
  /** Role of the related character */
  characterRole?: CharacterRole;
  /** Avatar URL of the related character */
  characterAvatar?: string;
  /** Type of relationship */
  type: RelationshipType;
}

/**
 * Chapter appearance
 */
export interface ChapterAppearance {
  /** Chapter ID */
  id: string;
  /** Chapter title */
  title: string;
}

/**
 * Character archetype options
 */
export const ARCHETYPE_OPTIONS = [
  { value: "reluctant-hero", label: "The Reluctant Hero" },
  { value: "chosen-one", label: "The Chosen One" },
  { value: "mentor", label: "The Mentor" },
  { value: "trickster", label: "The Trickster" },
  { value: "sage", label: "The Sage" },
] as const;

/**
 * Character data model
 */
export interface Character {
  /** Unique identifier */
  id: string;
  /** Character name */
  name: string;
  /** Character age */
  age?: number;
  /** Character role */
  role: CharacterRole;
  /** Character group */
  group: CharacterGroup;
  /** Character archetype */
  archetype?: string;
  /** Avatar image URL */
  avatarUrl?: string;
  /** Character description */
  description?: string;
  /** Personality traits */
  traits: string[];
  /** Relationships with other characters */
  relationships: CharacterRelationship[];
  /** Chapter appearances */
  appearances: ChapterAppearance[];
}

/**
 * Role display configuration
 */
export const ROLE_DISPLAY: Record<
  CharacterRole,
  { label: string; color: string }
> = {
  protagonist: { label: "Protagonist", color: "text-blue-400" },
  antagonist: { label: "Antagonist", color: "text-red-400" },
  deuteragonist: { label: "Deuteragonist", color: "text-purple-400" },
  mentor: { label: "Mentor", color: "text-green-400" },
  ally: { label: "Ally", color: "text-yellow-400" },
};

/**
 * Relationship type display configuration
 */
export const RELATIONSHIP_TYPE_DISPLAY: Record<
  RelationshipType,
  { label: string; color: string }
> = {
  rival: { label: "Rival", color: "bg-red-500/50" },
  mentor: { label: "Mentor", color: "bg-blue-500/50" },
  ally: { label: "Ally", color: "bg-green-500/50" },
  enemy: { label: "Enemy", color: "bg-red-600/50" },
  friend: { label: "Friend", color: "bg-blue-400/50" },
  family: { label: "Family", color: "bg-purple-500/50" },
};

/**
 * Group display options
 */
export const GROUP_OPTIONS: { value: CharacterGroup; label: string }[] = [
  { value: "main", label: "Main Cast" },
  { value: "supporting", label: "Supporting" },
  { value: "others", label: "Others" },
];
