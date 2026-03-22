export const PUBLIC_LISTING_ACCESS_VALUE = "granted";
export const PUBLIC_LISTING_FORM_PATH = "/classificados/anunciar";
export const PUBLIC_LISTING_ACCESS_ROUTE = "/api/prelaunch/listing-access";
export const PUBLIC_LISTING_PAGE_ACCESS_COOKIE = "ags_public_listing_page";
export const PUBLIC_LISTING_API_ACCESS_COOKIE = "ags_public_listing_api";
export const PUBLIC_LISTING_CREATED_BY = "prelaunch-public";
export const PUBLIC_LISTING_ACCESS_MAX_AGE = 60 * 60 * 24 * 7;

type CookieStoreLike = {
  get(name: string): { value?: string } | undefined;
};

function hasGrantedValue(store: CookieStoreLike, cookieName: string) {
  return store.get(cookieName)?.value === PUBLIC_LISTING_ACCESS_VALUE;
}

export function hasPublicListingPageAccess(store: CookieStoreLike) {
  return hasGrantedValue(store, PUBLIC_LISTING_PAGE_ACCESS_COOKIE);
}

export function hasPublicListingApiAccess(store: CookieStoreLike) {
  return hasGrantedValue(store, PUBLIC_LISTING_API_ACCESS_COOKIE);
}
