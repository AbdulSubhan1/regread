import { AE } from "./ae";
import { PK } from "./pk";
import { QA } from "./qa";
import { SA } from "./sa";
import type { CountryCode, RegionProfile } from "./types";

/** Adding a country = one profile file + one line here. */
export const PROFILES: Record<CountryCode, RegionProfile> = { AE, PK, SA, QA };
