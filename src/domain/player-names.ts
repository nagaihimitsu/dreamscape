/**
 * The title's name fields show the default names as placeholders. A field left
 * empty (spaces only count as empty) starts with that default name; anything
 * typed is used as typed, without the spaces around it.
 */
export function nameOrDefault(typed: string, defaultName: string): string {
  return typed.trim() || defaultName;
}
