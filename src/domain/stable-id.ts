import { z } from "zod";

/** A content ID kept in a save: lower-case letters, digits and underscores, starting with a letter. */
export const stableContentId = z.string().regex(/^[a-z][a-z0-9_]*$/);
