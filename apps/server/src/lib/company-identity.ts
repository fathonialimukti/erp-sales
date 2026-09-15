/**
 * Company letterhead identity for print surfaces (server PDF + client print
 * sheets). Env-sourced with sane defaults, per the PDF Export Overhaul
 * contract — text-based; logo asset upload is deferred.
 *
 * ponytail: DB-backed `company.*` app settings exist in settings-service, but
 * the frozen contract pins env-sourced identity; wiring the DB is deferred.
 */

export interface CompanyIdentity {
    name: string;
    addressLines: string[];
    phone: string;
    taxId: string;
}

const COMPANY_DEFAULT_NAME = 'B2B CRM';

/** Env read following the settings-service convention: unset or blank → default. */
const envOr = (key: string, fallback: string): string => {
    const raw = process.env[key];
    return raw !== undefined && raw.trim() !== '' ? raw.trim() : fallback;
};

/**
 * Letterhead identity. `COMPANY_ADDRESS` accepts newline- or
 * semicolon-separated lines so a single env var can carry a multi-line
 * address block.
 */
export const getCompanyIdentity = (): CompanyIdentity => ({
    name: envOr('COMPANY_NAME', COMPANY_DEFAULT_NAME),
    addressLines: envOr('COMPANY_ADDRESS', '')
        .split(/\r?\n|;/)
        .map((line) => line.trim())
        .filter(Boolean),
    phone: envOr('COMPANY_PHONE', ''),
    taxId: envOr('COMPANY_TAX_ID', ''),
});
